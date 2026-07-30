import { prisma } from '../../lib/prisma.js'
import { hashPassword, referralCode } from '../../lib/hash.js'
import { allocatePlayerNo } from '../../lib/playerNo.js'
import { allocatePanelId } from '../../lib/panelId.js'
import { conflict, notFound } from '../../core/errors.js'
import { customAlphabet } from 'nanoid'

const genPassword = customAlphabet('abcdefghjkmnpqrstuvwxyz23456789', 10)

async function ensureWalletAccounts(userId: string) {
  for (const bucket of ['MAIN', 'BONUS', 'FROZEN', 'COMMISSION'] as const) {
    await prisma.ledgerAccount.upsert({
      where: { ownerId_bucket_currency: { ownerId: userId, bucket, currency: 'PKR' } },
      update: {},
      create: { ownerId: userId, bucket, currency: 'PKR' },
    })
  }
}

async function uniqueReferralCode(): Promise<string> {
  let code = referralCode()
  while (await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } })) code = referralCode()
  return code
}

/** Admin creates a brand-new C2C merchant (not referral agent / mentor). */
export async function createAgent(input: { phone: string; displayName: string; password?: string }) {
  const existing = await prisma.user.findUnique({ where: { phone: input.phone } })
  if (existing) throw conflict('Phone already registered')
  const password = input.password || genPassword()
  const passwordHash = await hashPassword(password)
  const code = await uniqueReferralCode()
  const panelId = await allocatePanelId()

  const user = await prisma.user.create({
    data: {
      phone: input.phone,
      passwordHash,
      displayName: input.displayName,
      role: 'AGENT',
      agentActive: true,
      panelId,
      referralCode: code,
    },
  })
  await ensureWalletAccounts(user.id)
  return {
    id: user.id,
    phone: user.phone,
    displayName: user.displayName,
    panelId,
    password,
  }
}

/** Promote existing user to C2C merchant and issue a fresh login. */
export async function makeAgent(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw notFound('User not found')
  const password = genPassword()
  const passwordHash = await hashPassword(password)
  const panelId = user.panelId ?? (await allocatePanelId())
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: 'AGENT', agentActive: true, passwordHash, panelId, playerNo: null },
  })
  await ensureWalletAccounts(userId)
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
  return {
    id: updated.id,
    phone: updated.phone,
    displayName: updated.displayName,
    panelId: updated.panelId,
    password,
  }
}

/** Approve / revoke referral Agent program (salary) — unrelated to C2C merchants. */
export async function setReferralAgentActive(userId: string, active: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw notFound('User not found')
  if (user.role === 'ADMIN') throw conflict('Cannot change admin referral-agent flag here')
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { referralAgentActive: active },
  })
  await ensureWalletAccounts(userId)
  return {
    id: updated.id,
    phone: updated.phone,
    displayName: updated.displayName,
    referralAgentActive: updated.referralAgentActive,
    walletsFilled: updated.walletsFilled,
    playerNo: updated.playerNo,
  }
}

/**
 * Promote an existing player (or any non-admin user) to MENTOR.
 * Creates a channel if they do not already own one. Password unchanged unless provided.
 */
export async function makeMentor(
  userId: string,
  input?: { channelCode?: string; channelName?: string; password?: string },
) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw notFound('User not found')
  if (user.role === 'ADMIN') throw conflict('Cannot convert an admin to mentor')
  if (user.role === 'AGENT') throw conflict('Demote C2C merchant first, then make mentor')
  if (user.role === 'MENTOR') {
    const ch = await prisma.channel.findFirst({ where: { ownerId: userId }, orderBy: { createdAt: 'asc' } })
    return {
      id: user.id,
      phone: user.phone,
      displayName: user.displayName,
      playerNo: user.playerNo,
      referralCode: user.referralCode,
      password: null as string | null,
      channel: ch ? { id: ch.id, code: ch.code, name: ch.name } : null,
      alreadyMentor: true,
    }
  }

  const channelCode = (input?.channelCode?.trim() || `m${user.playerNo}`).slice(0, 30)
  const channelName = (input?.channelName?.trim() || `${user.displayName} channel`).slice(0, 60)
  const codeClash = await prisma.channel.findUnique({ where: { code: channelCode } })
  if (codeClash && codeClash.ownerId !== userId) throw conflict('Channel code already exists')

  const data: { role: 'MENTOR'; passwordHash?: string } = { role: 'MENTOR' }
  let password: string | null = null
  if (input?.password?.trim()) {
    password = input.password.trim()
    if (password.length < 6) throw conflict('Password must be at least 6 characters')
    data.passwordHash = await hashPassword(password)
  }

  const updated = await prisma.user.update({ where: { id: userId }, data })
  await ensureWalletAccounts(userId)

  let channel = await prisma.channel.findFirst({ where: { ownerId: userId }, orderBy: { createdAt: 'asc' } })
  if (!channel) {
    channel = await prisma.channel.create({
      data: {
        code: channelCode,
        name: channelName,
        ownerId: userId,
        enabled: true,
      },
    })
  }

  if (password) {
    await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
  }

  return {
    id: updated.id,
    phone: updated.phone,
    displayName: updated.displayName,
    playerNo: updated.playerNo,
    referralCode: updated.referralCode,
    password,
    channel: { id: channel.id, code: channel.code, name: channel.name },
    alreadyMentor: false,
  }
}

/** Demote mentor back to normal player (keeps owned channels). */
export async function demoteMentor(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw notFound('User not found')
  if (user.role !== 'MENTOR') throw conflict('User is not a mentor')
  const updated = await prisma.user.update({ where: { id: userId }, data: { role: 'PLAYER' } })
  return { id: updated.id, role: updated.role, phone: updated.phone, displayName: updated.displayName }
}

/** Admin creates a Mentor account (MENTOR role) — unrelated to C2C. */
export async function createMentor(input: {
  phone: string
  displayName: string
  password?: string
  channelCode: string
  channelName: string
}) {
  const existing = await prisma.user.findUnique({ where: { phone: input.phone } })
  if (existing) throw conflict('Phone already registered')
  const codeClash = await prisma.channel.findUnique({ where: { code: input.channelCode } })
  if (codeClash) throw conflict('Channel code already exists')

  const password = input.password || genPassword()
  const passwordHash = await hashPassword(password)
  const code = await uniqueReferralCode()
  const playerNo = await allocatePlayerNo()

  const user = await prisma.user.create({
    data: {
      phone: input.phone,
      passwordHash,
      displayName: input.displayName,
      role: 'MENTOR',
      playerNo,
      referralCode: code,
    },
  })
  await ensureWalletAccounts(user.id)
  const channel = await prisma.channel.create({
    data: {
      code: input.channelCode,
      name: input.channelName,
      ownerId: user.id,
      enabled: true,
    },
  })
  return {
    id: user.id,
    phone: user.phone,
    displayName: user.displayName,
    referralCode: code,
    playerNo,
    password,
    channel: { id: channel.id, code: channel.code, name: channel.name },
  }
}

export async function resetMentorPassword(userId: string, customPassword?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== 'MENTOR') throw notFound('Mentor not found')
  const password = customPassword?.trim() || genPassword()
  if (password.length < 6) throw conflict('Password must be at least 6 characters')
  const passwordHash = await hashPassword(password)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
  return { id: user.id, phone: user.phone, displayName: user.displayName, password }
}

/** Reset C2C merchant panel password (shown once). */
export async function resetAgentPassword(userId: string, customPassword?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== 'AGENT') throw notFound('C2C merchant not found')
  const password = customPassword?.trim() || genPassword()
  if (password.length < 6) throw conflict('Password must be at least 6 characters')
  const passwordHash = await hashPassword(password)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
  return {
    id: user.id,
    phone: user.phone,
    displayName: user.displayName,
    panelId: user.panelId,
    password,
  }
}
