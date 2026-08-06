import { repairCommissionSettlements } from '../src/modules/commission/commission.daily.js'
import { prisma } from '../src/lib/prisma.js'

async function main() {
  const dayKey = process.argv[2] ?? '2026-08-05'
  await repairCommissionSettlements(dayKey, dayKey)

  const member = await prisma.user.findFirst({
    where: { playerNo: 1812002 },
    select: { id: true, playerNo: true },
  })
  const agent = await prisma.user.findFirst({
    where: { playerNo: 8638904 },
    select: { id: true },
  })
  if (!member || !agent) {
    console.log('users not found')
    return
  }

  const prefix = `${dayKey}:${member.id}`
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      account: { ownerId: agent.id, bucket: 'COMMISSION' },
      transaction: {
        type: 'COMMISSION',
        referenceId: { startsWith: prefix },
        referenceType: { in: ['daily-principal-loss', 'daily-withdraw-claw'] },
      },
    },
    select: {
      direction: true,
      amount: true,
      transaction: { select: { referenceType: true } },
    },
  })

  let loss = 0n
  let claw = 0n
  for (const e of entries) {
    const d = e.direction === 'CREDIT' ? e.amount : -e.amount
    if (e.transaction.referenceType === 'daily-principal-loss') loss += d
    else claw += d
  }
  console.log(`Member ${member.playerNo} agent commission PKT ${dayKey}:`)
  console.log(`  loss net: Rs ${Number(loss) / 100}`)
  console.log(`  claw net: Rs ${Number(claw) / 100}`)
  console.log(`  total net: Rs ${Number(loss + claw) / 100}`)
  console.log(`  expected: loss +10500 +10500, claw -9985, total +11015`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
