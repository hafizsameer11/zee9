import type { Role } from '@prisma/client'
import type { Tx } from '../../lib/prisma.js'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { getSettings } from '../../core/settings.js'
import { hashPassword, verifyPassword, sha256, referralCode } from '../../lib/hash.js'
import { signAccess, signRefresh, verifyRefresh } from '../../lib/jwt.js'
import { toPaisa, applyPct } from '../../lib/money.js'
import { badRequest, conflict, unauthorized } from '../../core/errors.js'

/** Walk up the referrer chain and create up to `maxLevels` referral edges. */
async function buildReferralEdges(tx: Tx, newUserId: string, referredById: string | null, maxLevels = 3) {
  let ancestorId = referredById
  for (let level = 1; level <= maxLevels && ancestorId; level++) {
    await tx.referralEdge.create({ data: { ancestorId, descendantId: newUserId, level } })
    const parent = await tx.user.findUnique({ where: { id: ancestorId }, select: { referredById: true } })
    ancestorId = parent?.referredById ?? null
  }
}

async function createSession(userId: string, meta: { ip?: string; ua?: string }) {
  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: 'pending',
      ip: meta.ip,
      userAgent: meta.ua,
      expiresAt: new Date(Date.now() + 30 * 86400000),
    },
  })
  const refresh = signRefresh({ sub: userId, sid: session.id })
  await prisma.session.update({ where: { id: session.id }, data: { refreshTokenHash: sha256(refresh) } })
  return refresh
}

export interface AuthResult {
  user: { id: string; phone: string; displayName: string; role: Role; referralCode: string }
  accessToken: string
  refreshToken: string
}

export async function register(input: {
  phone: string
  password: string
  displayName: string
  referralCode?: string
  shareCode?: string
  channel?: string
  bindCode?: string
  ip?: string
  ua?: string
}): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { phone: input.phone } })
  if (existing) throw conflict('Phone already registered')

  // The share code carries the direct referrer; `channel` groups them under a mentor.
  const refCode = input.referralCode || input.shareCode
  let referrer: { id: string } | null = null
  if (refCode) {
    referrer = await prisma.user.findUnique({ where: { referralCode: refCode }, select: { id: true } })
  }

  // Resolve the channel; fall back to the channel owner (mentor) as referrer if needed.
  let channelCode: string | null = null
  if (input.channel) {
    const channel = await prisma.channel.findFirst({
      where: { code: input.channel, enabled: true },
      select: { code: true, ownerId: true },
    })
    if (channel) {
      channelCode = channel.code
      if (!referrer) referrer = { id: channel.ownerId }
    }
  }

  // A supplied code that resolves to nothing (and no channel fallback) is a bad link.
  if (refCode && !referrer) throw badRequest('Invalid referral / share code')

  const settings = await getSettings()
  const passwordHash = await hashPassword(input.password)

  // Ensure a unique referral code
  let code = referralCode()
  while (await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } })) code = referralCode()

  const userId = await runMoneyTx(async (tx) => {
    const user = await tx.user.create({
      data: {
        phone: input.phone,
        passwordHash,
        displayName: input.displayName,
        referralCode: code,
        referredById: referrer?.id ?? null,
        role: 'PLAYER',
        channelCode,
        bindCode: input.bindCode ?? null,
      },
    })

    await buildReferralEdges(tx, user.id, referrer?.id ?? null)

    // Registration bonus → BONUS bucket, with wager requirement
    const bonus = toPaisa(settings.registrationBonus)
    if (bonus > 0n) {
      await post(tx, {
        type: 'REGISTRATION_BONUS',
        referenceType: 'user',
        referenceId: user.id,
        legs: [
          { account: { system: 'BONUS_POOL' }, direction: 'DEBIT', amount: bonus },
          { account: { userId: user.id, bucket: 'BONUS' }, direction: 'CREDIT', amount: bonus },
        ],
      })
      await tx.bonus.create({
        data: {
          userId: user.id,
          type: 'REGISTRATION',
          amount: bonus,
          wagerRequired: applyPct(bonus, settings.bonusWager * 100), // wager multiplier as %
          status: 'ACTIVE',
        },
      })
    }
    return user.id
  })

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const accessToken = signAccess({ sub: user.id, role: user.role })
  const refreshToken = await createSession(user.id, { ip: input.ip, ua: input.ua })
  return {
    user: { id: user.id, phone: user.phone, displayName: user.displayName, role: user.role, referralCode: user.referralCode },
    accessToken,
    refreshToken,
  }
}

export async function login(input: { phone: string; password: string; ip?: string; ua?: string }): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { phone: input.phone } })
  if (!user) throw unauthorized('Invalid phone or password')
  if (user.status === 'BANNED') throw unauthorized('Account is banned')
  const okPw = await verifyPassword(input.password, user.passwordHash)
  if (!okPw) throw unauthorized('Invalid phone or password')

  const accessToken = signAccess({ sub: user.id, role: user.role })
  const refreshToken = await createSession(user.id, { ip: input.ip, ua: input.ua })
  return {
    user: { id: user.id, phone: user.phone, displayName: user.displayName, role: user.role, referralCode: user.referralCode },
    accessToken,
    refreshToken,
  }
}

export async function refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: { sub: string; sid: string }
  try {
    payload = verifyRefresh(token)
  } catch {
    throw unauthorized('Invalid refresh token')
  }
  const session = await prisma.session.findUnique({ where: { id: payload.sid } })
  if (!session || session.revokedAt || session.expiresAt < new Date()) throw unauthorized('Session expired')
  if (session.refreshTokenHash !== sha256(token)) {
    // Token reuse / mismatch → revoke the session defensively
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } })
    throw unauthorized('Refresh token reuse detected')
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.sub } })
  const accessToken = signAccess({ sub: user.id, role: user.role })
  const newRefresh = signRefresh({ sub: user.id, sid: session.id })
  await prisma.session.update({ where: { id: session.id }, data: { refreshTokenHash: sha256(newRefresh) } })
  return { accessToken, refreshToken: newRefresh }
}

export async function logout(refreshToken: string) {
  try {
    const payload = verifyRefresh(refreshToken)
    await prisma.session.updateMany({ where: { id: payload.sid }, data: { revokedAt: new Date() } })
  } catch {
    /* ignore */
  }
}

export async function changePassword(userId: string, oldPw: string, newPw: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  if (!(await verifyPassword(oldPw, user.passwordHash))) throw badRequest('Old password is incorrect')
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPw) } })
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
}
