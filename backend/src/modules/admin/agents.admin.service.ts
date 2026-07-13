import { prisma } from '../../lib/prisma.js'
import { hashPassword, referralCode } from '../../lib/hash.js'
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

/** Admin creates a brand-new agent account and returns the generated login (shown once). */
export async function createAgent(input: { phone: string; displayName: string; password?: string }) {
  const existing = await prisma.user.findUnique({ where: { phone: input.phone } })
  if (existing) throw conflict('Phone already registered')
  const password = input.password || genPassword()
  const passwordHash = await hashPassword(password)
  const code = await uniqueReferralCode()

  const user = await prisma.user.create({
    data: {
      phone: input.phone,
      passwordHash,
      displayName: input.displayName,
      role: 'AGENT',
      agentActive: true,
      referralCode: code,
    },
  })
  await ensureWalletAccounts(user.id)
  return { id: user.id, phone: user.phone, displayName: user.displayName, referralCode: code, password }
}

/** Admin promotes an existing user (who reached agent rank) to AGENT and issues a fresh login. */
export async function makeAgent(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw notFound('User not found')
  const password = genPassword()
  const passwordHash = await hashPassword(password)
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: 'AGENT', agentActive: true, passwordHash },
  })
  await ensureWalletAccounts(userId)
  // Revoke existing sessions so the new credentials take effect everywhere.
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
  return { id: updated.id, phone: updated.phone, displayName: updated.displayName, referralCode: updated.referralCode, password }
}
