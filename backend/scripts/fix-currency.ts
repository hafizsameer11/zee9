import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const prizes = await p.wheelPrize.findMany()
let n = 0
for (const prize of prizes) {
  if (prize.label.includes('₹')) {
    const label = prize.label.replace(/₹\s?/g, 'Rs ')
    await p.wheelPrize.update({ where: { id: prize.id }, data: { label } })
    n++
  }
}
console.log(`Updated ${n} wheel prize labels to Rs`)
await p.$disconnect()
