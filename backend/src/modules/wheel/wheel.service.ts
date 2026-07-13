import { prisma } from '../../lib/prisma.js'
import { getSettings, type Settings } from '../../core/settings.js'
import { toPaisa } from '../../lib/money.js'
import type { Prisma } from '@prisma/client'

export async function getWheelStatus(userId: string) {
  const s = await getSettings()
  return computeTickets(userId, s)
}

function formatTicketStatus(totalDeposits: bigint, used: number, s: Settings) {
  const depositPerSpin = s.wheelDepositPerSpin || 1000
  const depPaisa = toPaisa(depositPerSpin)
  const earned = depPaisa > 0n ? Number(totalDeposits / depPaisa) : 0
  const tickets = Math.max(0, earned - used)
  const progressPaisa = depPaisa > 0n ? Number(totalDeposits % depPaisa) : 0
  const progressPct = depPaisa > 0n ? Math.round((progressPaisa / Number(depPaisa)) * 100) : 0
  return {
    tickets,
    earned,
    used,
    depositPerSpin,
    depositProgress: progressPaisa / 100,
    depositRequired: depositPerSpin,
    progressPct,
    totalDeposits: Number(totalDeposits) / 100,
  }
}

export async function computeTickets(userId: string, s: Settings) {
  const deposits = await prisma.deposit.aggregate({
    where: { userId, status: 'APPROVED' },
    _sum: { amount: true },
  })
  const totalDeposits = deposits._sum.amount ?? 0n
  const used = await prisma.wheelSpin.count({ where: { userId } })
  return formatTicketStatus(totalDeposits, used, s)
}

export async function computeTicketsInsideTx(tx: Prisma.TransactionClient, userId: string, s: Settings) {
  const deposits = await tx.deposit.aggregate({
    where: { userId, status: 'APPROVED' },
    _sum: { amount: true },
  })
  const totalDeposits = deposits._sum.amount ?? 0n
  const used = await tx.wheelSpin.count({ where: { userId } })
  return formatTicketStatus(totalDeposits, used, s)
}
