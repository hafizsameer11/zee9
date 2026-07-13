import { prisma } from '../../lib/prisma.js'

export async function balances(userId: string) {
  const accounts = await prisma.ledgerAccount.findMany({
    where: { ownerId: userId, currency: 'PKR' },
    select: { bucket: true, balance: true },
  })
  const map: Record<string, bigint> = { MAIN: 0n, BONUS: 0n, FROZEN: 0n, COMMISSION: 0n }
  for (const a of accounts) if (a.bucket) map[a.bucket] = a.balance
  return map
}

export async function transactions(userId: string, limit = 50) {
  const accountIds = (
    await prisma.ledgerAccount.findMany({ where: { ownerId: userId }, select: { id: true } })
  ).map((a) => a.id)

  const entries = await prisma.ledgerEntry.findMany({
    where: { accountId: { in: accountIds } },
    include: { transaction: { select: { type: true, createdAt: true, referenceType: true } }, account: { select: { bucket: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return entries.map((e) => ({
    id: e.id,
    type: e.transaction.type,
    bucket: e.account.bucket,
    direction: e.direction,
    amount: e.amount,
    signed: e.direction === 'CREDIT' ? e.amount : -e.amount,
    time: e.transaction.createdAt,
  }))
}
