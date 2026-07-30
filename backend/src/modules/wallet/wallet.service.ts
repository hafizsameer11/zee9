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
    include: {
      transaction: { select: { type: true, createdAt: true, referenceType: true, meta: true } },
      account: { select: { bucket: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return entries.map((e) => ({
    id: e.id,
    type: e.transaction.type,
    referenceType: e.transaction.referenceType,
    label: labelFor(e.transaction.type, e.transaction.referenceType, e.transaction.meta),
    bucket: e.account.bucket,
    direction: e.direction,
    amount: e.amount,
    signed: e.direction === 'CREDIT' ? e.amount : -e.amount,
    time: e.transaction.createdAt,
  }))
}

function labelFor(type: string, referenceType: string | null, meta: unknown): string {
  const m = (meta && typeof meta === 'object' ? meta : {}) as { game?: string; kind?: string }
  const ref = referenceType || ''
  const game =
    m.game ||
    (ref.startsWith('mines')
      ? 'Mines'
      : ref.startsWith('aviator')
        ? 'Aviator'
        : ref.startsWith('crash')
          ? 'Crash'
          : ref.startsWith('wingo')
            ? 'WinGo'
            : ref.startsWith('lottery')
              ? 'WinGo Lottery'
              : null)

  if (type === 'DAILY_BONUS' && ref === 'rebet') return 'Bet Rebate'
  if (type === 'DAILY_BONUS' && ref === 'return-bonus') return 'Welcome back bonus'
  if (type === 'DAILY_BONUS' && ref === 'free-cash') return 'Free Cash'
  if (type === 'GAME_BET' || ref.endsWith('-bet')) return game ? `${game} bet` : 'Game bet'
  if (type === 'GAME_WIN' || ref.endsWith('-win')) {
    if (m.kind === 'cashout') return game ? `${game} cashout` : 'Game cashout'
    return game ? `${game} win` : 'Game win'
  }
  if (type === 'GAME_REFUND' || ref.endsWith('-revoke')) return game ? `${game} refund` : 'Bet refund'

  const map: Record<string, string> = {
    DEPOSIT: 'Deposit',
    DEPOSIT_BONUS: 'Deposit bonus',
    WITHDRAWAL_FREEZE: 'Withdrawal',
    WITHDRAWAL_PAID: 'Withdrawal paid',
    WITHDRAWAL_UNFREEZE: 'Withdrawal returned',
    BONUS_RELEASE: 'Bonus released',
    DAILY_BONUS: 'Daily bonus',
    REGISTRATION_BONUS: 'Registration bonus',
    COMMISSION: 'Commission',
    WHEEL_PRIZE: 'Wheel prize',
    ADMIN_ADJUST: 'Admin adjustment',
  }
  return map[type] || type.replace(/_/g, ' ')
}
