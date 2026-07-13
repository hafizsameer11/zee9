import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const accs = await p.ledgerAccount.findMany()
let sum = 0n
for (const a of accs) sum += a.balance

let mismatches = 0
for (const a of accs) {
  const entries = await p.ledgerEntry.findMany({ where: { accountId: a.id } })
  let calc = 0n
  for (const e of entries) calc += e.direction === 'CREDIT' ? e.amount : -e.amount
  if (calc !== a.balance) {
    mismatches++
    console.log('MISMATCH', a.bucket ?? a.system, 'cached', a.balance.toString(), 'calc', calc.toString())
  }
}

const txs = await p.ledgerTransaction.findMany({ include: { entries: true } })
let unbalanced = 0
for (const t of txs) {
  let d = 0n
  let c = 0n
  for (const e of t.entries) e.direction === 'DEBIT' ? (d += e.amount) : (c += e.amount)
  if (d !== c) {
    unbalanced++
    console.log('UNBALANCED TX', t.type)
  }
}

console.log('accounts:', accs.length, '| txns:', txs.length)
console.log('sum of ALL balances (must be 0):', sum.toString())
console.log('balance-vs-entries mismatches (must be 0):', mismatches)
console.log('unbalanced transactions (must be 0):', unbalanced)
await p.$disconnect()
