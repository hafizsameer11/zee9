import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { ok } from '../../lib/respond.js'
import { prisma } from '../../lib/prisma.js'
import { runMoneyTx } from '../../core/tx.js'
import { post } from '../../core/ledger.js'
import { notify } from '../../core/notify.js'
import { badRequest, unprocessable } from '../../core/errors.js'
import { getSettings } from '../../core/settings.js'
import { computeTickets, computeTicketsInsideTx } from './wheel.service.js'

export const wheelRoutes = Router()

wheelRoutes.use(authenticate)

/** Labels that mean no cash / no physical prize. */
export function isNonePrize(label: string): boolean {
  const l = label.trim().toLowerCase()
  return l === 'none' || l === 'no win' || l.includes('try again') || l === 'again'
}

function parseCashAmount(label: string, isPhysical: boolean): bigint {
  if (isPhysical || isNonePrize(label)) return 0n
  return BigInt(Math.round((Number(label.replace(/[^\d.]/g, '')) || 0) * 100))
}

async function executeSpin(userId: string, wheelType: 'SPIN' | 'DEPOSIT') {
  const s = await getSettings()
  const status = await computeTickets(userId, s)
  if (status.tickets <= 0) {
    throw unprocessable(`Deposit Rs ${status.depositRequired} to earn a spin (progress: Rs ${status.depositProgress.toFixed(0)} / ${status.depositRequired})`)
  }

  const prizes = await prisma.wheelPrize.findMany({ where: { wheel: wheelType }, orderBy: { order: 'asc' } })
  if (prizes.length === 0) throw badRequest('Wheel not configured')

  const eligible = prizes.filter((p) => p.weight > 0)
  let picked = prizes[prizes.length - 1]!

  if (eligible.length === 0) {
    picked = prizes.find((p) => isNonePrize(p.label)) ?? picked
  } else {
    const total = eligible.reduce((sum, p) => sum + p.weight, 0)
    let roll = Math.random() * total
    picked = eligible[eligible.length - 1]!
    for (const p of eligible) {
      if (roll < p.weight) { picked = p; break }
      roll -= p.weight
    }
  }

  const cash = parseCashAmount(picked.label, picked.isPhysical)
  const title = wheelType === 'DEPOSIT' ? 'Deposit Wheel' : 'Lucky Wheel'

  const spin = await runMoneyTx(async (tx) => {
    const ticketStatus = await computeTicketsInsideTx(tx, userId, s)
    if (ticketStatus.tickets <= 0) throw unprocessable('No spins available')

    const rec = await tx.wheelSpin.create({ data: { userId, prizeId: picked.id, amount: cash, wheel: wheelType } })
    if (cash > 0n) {
      await post(tx, {
        type: 'WHEEL_PRIZE',
        referenceType: 'wheelSpin',
        referenceId: rec.id,
        legs: [
          { account: { system: 'BONUS_POOL' }, direction: 'DEBIT', amount: cash },
          { account: { userId, bucket: 'BONUS' }, direction: 'CREDIT', amount: cash },
        ],
      })
      const wagerRequired = (cash * BigInt(Math.round(s.bonusWager * 100))) / 100n
      await tx.bonus.create({
        data: { userId, type: 'WHEEL', amount: cash, wagerRequired, status: 'ACTIVE' },
      })
    }
    const won = picked.isPhysical
      ? `a ${picked.label}`
      : cash > 0n
        ? `Rs ${(Number(cash) / 100).toLocaleString('en-PK')}`
        : 'nothing this time'
    await notify(tx, userId, 'wheel', title, `You spun the ${title.toLowerCase()} and won ${won}.`)
    return rec
  })

  const after = await computeTickets(userId, s)
  return {
    prize: { id: picked.id, label: picked.label, isPhysical: picked.isPhysical },
    amount: Number(cash) / 100,
    spinId: spin.id,
    tickets: after.tickets,
  }
}

wheelRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const s = await getSettings()
    const prizes = await prisma.wheelPrize.findMany({ where: { wheel: 'SPIN' }, orderBy: { order: 'asc' } })
    const status = await computeTickets(userId, s)
    ok(res, {
      wheel: 'SPIN',
      prizes: prizes.map((p) => ({ id: p.id, label: p.label, color: p.color, isPhysical: p.isPhysical, weight: p.weight })),
      ...status,
    })
  }),
)

wheelRoutes.get(
  '/deposit',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const s = await getSettings()
    const prizes = await prisma.wheelPrize.findMany({ where: { wheel: 'DEPOSIT' }, orderBy: { order: 'asc' } })
    const status = await computeTickets(userId, s)
    ok(res, {
      wheel: 'DEPOSIT',
      prizes: prizes.map((p) => ({ id: p.id, label: p.label, color: p.color, isPhysical: p.isPhysical, weight: p.weight })),
      ...status,
    })
  }),
)

/** Server-authoritative weighted spin. Requires an available ticket. */
wheelRoutes.post(
  '/spin',
  asyncHandler(async (req, res) => {
    ok(res, await executeSpin(req.user!.id, 'SPIN'), 201)
  }),
)

wheelRoutes.post(
  '/deposit/spin',
  asyncHandler(async (req, res) => {
    ok(res, await executeSpin(req.user!.id, 'DEPOSIT'), 201)
  }),
)
