import type { Bucket, LedgerTxType, SystemAccount } from '@prisma/client'
import type { Tx } from '../lib/prisma.js'
import { AppError } from './errors.js'

export type AccountRef =
  | { userId: string; bucket: Bucket }
  | { system: SystemAccount }

export interface Leg {
  account: AccountRef
  direction: 'DEBIT' | 'CREDIT'
  amount: bigint
}

export interface PostInput {
  type: LedgerTxType
  legs: Leg[]
  idempotencyKey?: string
  referenceType?: string
  referenceId?: string
  createdById?: string
  meta?: Record<string, unknown>
  /** Accounts that must not go negative after posting (e.g. player MAIN on withdrawal). */
  assertNonNegative?: AccountRef[]
}

const CURRENCY = 'PKR'

async function getOrCreateAccount(tx: Tx, ref: AccountRef): Promise<{ id: string; balance: bigint }> {
  if ('system' in ref) {
    return tx.ledgerAccount.upsert({
      where: { system_currency: { system: ref.system, currency: CURRENCY } },
      create: { system: ref.system, currency: CURRENCY },
      update: {},
      select: { id: true, balance: true },
    })
  }
  return tx.ledgerAccount.upsert({
    where: { ownerId_bucket_currency: { ownerId: ref.userId, bucket: ref.bucket, currency: CURRENCY } },
    create: { ownerId: ref.userId, bucket: ref.bucket, currency: CURRENCY },
    update: {},
    select: { id: true, balance: true },
  })
}

/**
 * The ONLY way money moves. Posts a balanced double-entry transaction inside
 * an existing SERIALIZABLE tx. Debits must equal credits.
 * Returns the ledger transaction id, or the existing one if idempotencyKey repeats.
 */
export async function post(tx: Tx, input: PostInput): Promise<string> {
  if (input.idempotencyKey) {
    const existing = await tx.ledgerTransaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true },
    })
    if (existing) return existing.id
  }

  // Validate legs
  let debit = 0n
  let credit = 0n
  for (const leg of input.legs) {
    if (leg.amount <= 0n) throw new AppError(500, 'LEDGER_INVALID', 'Ledger leg amount must be positive')
    if (leg.direction === 'DEBIT') debit += leg.amount
    else credit += leg.amount
  }
  if (debit !== credit) {
    throw new AppError(500, 'LEDGER_UNBALANCED', `Ledger not balanced: debit ${debit} != credit ${credit}`)
  }

  const ledgerTx = await tx.ledgerTransaction.create({
    data: {
      type: input.type,
      idempotencyKey: input.idempotencyKey,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      createdById: input.createdById,
      meta: input.meta as any,
    },
    select: { id: true },
  })

  // Aggregate per-account deltas (balance = credits - debits)
  const resolved: { ref: AccountRef; id: string; delta: bigint }[] = []
  for (const leg of input.legs) {
    const acc = await getOrCreateAccount(tx, leg.account)
    const delta = leg.direction === 'CREDIT' ? leg.amount : -leg.amount
    resolved.push({ ref: leg.account, id: acc.id, delta })
    await tx.ledgerEntry.create({
      data: { transactionId: ledgerTx.id, accountId: acc.id, direction: leg.direction, amount: leg.amount },
    })
  }

  // Apply balance deltas
  const newBalances = new Map<string, bigint>()
  for (const r of resolved) {
    const updated = await tx.ledgerAccount.update({
      where: { id: r.id },
      data: { balance: { increment: r.delta } },
      select: { balance: true },
    })
    newBalances.set(r.id, updated.balance)
  }

  // Non-negative assertions
  if (input.assertNonNegative) {
    for (const ref of input.assertNonNegative) {
      const acc = await getOrCreateAccount(tx, ref)
      const bal = newBalances.get(acc.id) ?? acc.balance
      if (bal < 0n) throw new AppError(422, 'INSUFFICIENT_FUNDS', 'Insufficient balance')
    }
  }

  return ledgerTx.id
}

/** Read a user's bucket balances (creates missing accounts lazily as 0). */
export async function getBalances(tx: Tx, userId: string) {
  const accounts = await tx.ledgerAccount.findMany({
    where: { ownerId: userId, currency: CURRENCY },
    select: { bucket: true, balance: true },
  })
  const map: Record<string, bigint> = { MAIN: 0n, BONUS: 0n, FROZEN: 0n, COMMISSION: 0n }
  for (const a of accounts) if (a.bucket) map[a.bucket] = a.balance
  return map
}
