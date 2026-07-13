import { Router } from 'express'
import { requireScope } from '../../middleware/requireScope.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import { pageParams, paged } from '../../lib/pagination.js'

export const ledgerRoutes = Router()
ledgerRoutes.use(requireScope('reports'))

// Ledger entry explorer (filter by user or transaction type).
ledgerRoutes.get(
  '/entries',
  asyncHandler(async (req, res) => {
    const p = pageParams(req)
    const userId = req.query.userId as string | undefined
    const type = req.query.type as string | undefined

    const accountFilter = userId ? { account: { ownerId: userId } } : {}
    const txFilter = type ? { transaction: { type: type as any } } : {}
    const where = { ...accountFilter, ...txFilter }

    const [rows, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.limit,
        include: {
          transaction: { select: { type: true, referenceType: true, referenceId: true, createdAt: true } },
          account: { select: { bucket: true, system: true, ownerId: true } },
        },
      }),
      prisma.ledgerEntry.count({ where }),
    ])
    ok(res, paged(rows, total, p))
  }),
)

// Reconciliation: closed-system + drift + balanced-transaction integrity report.
ledgerRoutes.get(
  '/reconciliation',
  asyncHandler(async (_req, res) => {
    const accounts = await prisma.ledgerAccount.findMany()
    let sum = 0n
    let mismatches = 0
    for (const a of accounts) {
      sum += a.balance
      const agg = await prisma.ledgerEntry.groupBy({ by: ['direction'], where: { accountId: a.id }, _sum: { amount: true } })
      let calc = 0n
      for (const g of agg) calc += g.direction === 'CREDIT' ? (g._sum.amount ?? 0n) : -(g._sum.amount ?? 0n)
      if (calc !== a.balance) mismatches++
    }

    const txs = await prisma.ledgerTransaction.findMany({ include: { entries: true } })
    let unbalanced = 0
    for (const t of txs) {
      let d = 0n
      let c = 0n
      for (const e of t.entries) e.direction === 'DEBIT' ? (d += e.amount) : (c += e.amount)
      if (d !== c) unbalanced++
    }

    ok(res, {
      accounts: accounts.length,
      transactions: txs.length,
      sumOfAllBalances: sum, // must be 0
      balanceDriftAccounts: mismatches, // must be 0
      unbalancedTransactions: unbalanced, // must be 0
      healthy: sum === 0n && mismatches === 0 && unbalanced === 0,
    })
  }),
)
