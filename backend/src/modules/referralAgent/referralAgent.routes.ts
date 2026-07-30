import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import { forbidden, unprocessable } from '../../core/errors.js'
import { balances } from '../wallet/wallet.service.js'
import { post } from '../../core/ledger.js'
import { runMoneyTx } from '../../core/tx.js'
import { toRupees } from '../../lib/money.js'
import { validate } from '../../middleware/validate.js'
import { z } from 'zod'

export const referralAgentRoutes = Router()

referralAgentRoutes.use(authenticate)

async function requireReferralAgent(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      referralAgentActive: true,
      role: true,
      displayName: true,
      phone: true,
      referralCode: true,
      walletsFilled: true,
      salaryTransferOpen: true,
      salaryApprovedPaisa: true,
    },
  })
  if (!u?.referralAgentActive && u?.role !== 'ADMIN') throw forbidden('Not an active referral agent')
  return u!
}

/** Cap approved to current COMMISSION balance; persist if drifted. */
async function syncApproved(userId: string, balance: bigint, approvedPaisa: bigint) {
  let approved = approvedPaisa
  if (approved < 0n) approved = 0n
  if (approved > balance) approved = balance
  if (approved !== approvedPaisa) {
    await prisma.user.update({ where: { id: userId }, data: { salaryApprovedPaisa: approved } })
  }
  return approved
}

referralAgentRoutes.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const u = await requireReferralAgent(req.user!.id)
    const bal = await balances(u.id)
    const commissionBal = bal.COMMISSION
    const approved = await syncApproved(u.id, commissionBal, u.salaryApprovedPaisa)

    const edges = await prisma.referralEdge.groupBy({
      by: ['level'],
      where: { ancestorId: u.id },
      _count: { _all: true },
    })
    const byLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0 }
    for (const e of edges) byLevel[e.level] = e._count._all

    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
    const [earnedAll, earnedWeek, accrued] = await Promise.all([
      prisma.commission.aggregate({ where: { agentId: u.id, amount: { gt: 0 } }, _sum: { amount: true } }),
      prisma.commission.aggregate({
        where: { agentId: u.id, amount: { gt: 0 }, createdAt: { gte: weekAgo } },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({ where: { agentId: u.id, status: 'ACCRUED', amount: { gt: 0 } }, _sum: { amount: true } }),
    ])

    const hold = commissionBal - approved
    ok(res, {
      id: u.id,
      name: u.displayName,
      phone: u.phone,
      referralCode: u.referralCode,
      walletsFilled: u.walletsFilled,
      active: u.referralAgentActive,
      commissionBalance: toRupees(commissionBal),
      salaryTransferOpen: u.salaryTransferOpen,
      salaryApproved: toRupees(approved),
      salaryHold: toRupees(hold),
      transferable: u.salaryTransferOpen ? toRupees(approved) : 0,
      mainBalance: toRupees(bal.MAIN),
      downline: { level1: byLevel[1], level2: byLevel[2], level3: byLevel[3] },
      earnedTotal: toRupees(earnedAll._sum.amount ?? 0n),
      earnedWeek: toRupees(earnedWeek._sum.amount ?? 0n),
      accrued: toRupees(accrued._sum.amount ?? 0n),
    })
  }),
)

/** Downline ordered Level 3 → Level 2 → Level 1 */
referralAgentRoutes.get(
  '/downline',
  asyncHandler(async (req, res) => {
    const u = await requireReferralAgent(req.user!.id)
    const levelFilter = req.query.level ? Number(req.query.level) : undefined
    const edges = await prisma.referralEdge.findMany({
      where: {
        ancestorId: u.id,
        ...(levelFilter ? { level: levelFilter } : { level: { lte: 3 } }),
      },
      orderBy: [{ level: 'desc' }, { descendantId: 'asc' }],
      take: 500,
      include: {
        descendant: {
          select: {
            id: true,
            displayName: true,
            phone: true,
            status: true,
            createdAt: true,
            referralAgentActive: true,
            role: true,
          },
        },
      },
    })

    const items = await Promise.all(
      edges.map(async (e) => {
        const [dep, wd, bets] = await Promise.all([
          prisma.deposit.aggregate({
            where: { userId: e.descendantId, status: 'APPROVED' },
            _sum: { amount: true },
          }),
          prisma.withdrawal.aggregate({
            where: { userId: e.descendantId, status: 'PAID' },
            _sum: { amount: true },
          }),
          prisma.gameRound.aggregate({
            where: { userId: e.descendantId },
            _sum: { bet: true, payout: true },
          }),
        ])
        return {
          level: e.level,
          id: e.descendant.id,
          name: e.descendant.displayName,
          phone: e.descendant.phone,
          status: e.descendant.status,
          joinedAt: e.descendant.createdAt,
          isReferralAgent: e.descendant.referralAgentActive,
          deposited: toRupees(dep._sum.amount ?? 0n),
          withdrawn: toRupees(wd._sum.amount ?? 0n),
          wagered: toRupees(bets._sum.bet ?? 0n),
          won: toRupees(bets._sum.payout ?? 0n),
        }
      }),
    )

    ok(res, { items })
  }),
)

referralAgentRoutes.get(
  '/commissions',
  asyncHandler(async (req, res) => {
    const u = await requireReferralAgent(req.user!.id)
    const rows = await prisma.commission.findMany({
      where: { agentId: u.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { sourceUser: { select: { displayName: true, phone: true } } },
    })
    ok(
      res,
      rows.map((c) => ({
        id: c.id,
        level: c.level,
        amount: toRupees(c.amount),
        status: c.status,
        at: c.createdAt,
        source: c.sourceUser.displayName,
        sourcePhone: c.sourceUser.phone,
      })),
    )
  }),
)

/**
 * Transfer admin-approved salary only (COMMISSION → MAIN).
 * Requires salaryTransferOpen; amount capped by salaryApprovedPaisa.
 */
referralAgentRoutes.post(
  '/salary/withdraw',
  validate({ body: z.object({ amount: z.number().positive().optional() }) }),
  asyncHandler(async (req, res) => {
    const u = await requireReferralAgent(req.user!.id)
    if (!u.referralAgentActive) throw forbidden('Referral agent inactive')
    if (!u.salaryTransferOpen) throw forbidden('Salary transfer is closed by admin')

    const result = await runMoneyTx(async (tx) => {
      const row = await tx.user.findUnique({
        where: { id: u.id },
        select: { salaryTransferOpen: true, salaryApprovedPaisa: true },
      })
      if (!row?.salaryTransferOpen) throw forbidden('Salary transfer is closed by admin')

      const bal = await tx.ledgerAccount.findFirst({
        where: { ownerId: u.id, bucket: 'COMMISSION', currency: 'PKR' },
      })
      const available = bal?.balance ?? 0n
      if (available <= 0n) throw unprocessable('No commission balance')

      let approved = row.salaryApprovedPaisa
      if (approved < 0n) approved = 0n
      if (approved > available) approved = available
      if (approved <= 0n) throw unprocessable('No approved salary to transfer — wait for admin approval')

      const want =
        req.body.amount != null ? BigInt(Math.round(Number(req.body.amount) * 100)) : approved
      let amount = want
      if (amount > approved) amount = approved
      if (amount > available) amount = available
      if (amount <= 0n) throw unprocessable('Invalid amount')

      await post(tx, {
        type: 'COMMISSION',
        referenceType: 'referral-salary-withdraw',
        referenceId: `${u.id}:${Date.now()}`,
        idempotencyKey: `ref-salary:${u.id}:${amount}:${Date.now()}`,
        legs: [
          { account: { userId: u.id, bucket: 'COMMISSION' }, direction: 'DEBIT', amount },
          { account: { userId: u.id, bucket: 'MAIN' }, direction: 'CREDIT', amount },
        ],
      })

      const nextApproved = approved - amount
      await tx.user.update({
        where: { id: u.id },
        data: { salaryApprovedPaisa: nextApproved < 0n ? 0n : nextApproved },
      })

      const remainingBal = available - amount
      if (remainingBal <= 0n) {
        await tx.commission.updateMany({
          where: { agentId: u.id, status: 'ACCRUED', amount: { gt: 0 } },
          data: { status: 'PAID' },
        })
      }

      return {
        amount: toRupees(amount),
        remainingApproved: toRupees(nextApproved < 0n ? 0n : nextApproved),
        remainingHold: toRupees(remainingBal - (nextApproved < 0n ? 0n : nextApproved)),
      }
    })
    ok(res, result)
  }),
)
