import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { customAlphabet } from 'nanoid'

const prisma = new PrismaClient()
const code = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)
const P = (rupees: number) => BigInt(Math.round(rupees * 100))

const SPIN_PRIZES = [
  { label: 'Laptop', color: '#6d5efc', weight: 1, isPhysical: true },
  { label: 'Mobile', color: '#17b877', weight: 2, isPhysical: true },
  { label: 'Bike', color: '#3b9df0', weight: 1, isPhysical: true },
  { label: 'Rs 10,000', color: '#f5b301', weight: 2 },
  { label: 'Rs 5,000', color: '#ef4a44', weight: 4 },
  { label: 'Rs 1,000', color: '#9b59b6', weight: 8 },
  { label: 'Rs 100', color: '#e67e22', weight: 20 },
  { label: 'Rs 50', color: '#16a085', weight: 25 },
  { label: 'Rs 20', color: '#c0392b', weight: 25 },
  { label: 'Try again', color: '#7f8c8d', weight: 12 },
]

async function upsertUser(opts: {
  phone: string
  password: string
  displayName: string
  role: 'PLAYER' | 'AGENT' | 'ADMIN'
  referredById?: string | null
  agentActive?: boolean
}) {
  const passwordHash = await bcrypt.hash(opts.password, 10)
  const user = await prisma.user.upsert({
    where: { phone: opts.phone },
    update: {},
    create: {
      phone: opts.phone,
      passwordHash,
      displayName: opts.displayName,
      role: opts.role,
      referralCode: code(),
      referredById: opts.referredById ?? null,
      agentActive: opts.agentActive ?? false,
    },
  })
  for (const bucket of ['MAIN', 'BONUS', 'FROZEN', 'COMMISSION'] as const) {
    await prisma.ledgerAccount.upsert({
      where: { ownerId_bucket_currency: { ownerId: user.id, bucket, currency: 'PKR' } },
      update: {},
      create: { ownerId: user.id, bucket, currency: 'PKR' },
    })
  }
  return user
}

async function seedWheel(wheel: 'SPIN' | 'DEPOSIT') {
  await prisma.wheelPrize.deleteMany({ where: { wheel } })
  await prisma.wheelPrize.createMany({
    data: SPIN_PRIZES.map((p, i) => ({ ...p, wheel, order: i })),
  })
}

async function main() {
  console.log('Seeding Zee9…')

  for (const system of ['HOUSE', 'BONUS_POOL', 'GATEWAY_CLEARING', 'AGENT_FLOAT'] as const) {
    await prisma.ledgerAccount.upsert({
      where: { system_currency: { system, currency: 'PKR' } },
      update: {},
      create: { system, currency: 'PKR' },
    })
  }

  const admin = await upsertUser({ phone: '03000000000', password: 'admin123', displayName: 'Super Admin', role: 'ADMIN' })
  const agent1 = await upsertUser({ phone: '03001111111', password: 'agent123', displayName: 'Adnan Ali', role: 'AGENT', agentActive: true })
  await upsertUser({ phone: '03002222222', password: 'agent123', displayName: 'Bilal Ahmed', role: 'AGENT', agentActive: false })
  const player1 = await upsertUser({ phone: '03003333333', password: 'player123', displayName: 'Player_289005', role: 'PLAYER', referredById: agent1.id })
  const player2 = await upsertUser({ phone: '03004444444', password: 'player123', displayName: 'Zee9_King', role: 'PLAYER', referredById: agent1.id })

  for (const p of [player1, player2]) {
    await prisma.referralEdge.upsert({
      where: { ancestorId_descendantId: { ancestorId: agent1.id, descendantId: p.id } },
      update: {},
      create: { ancestorId: agent1.id, descendantId: p.id, level: 1 },
    })
  }

  console.log('Admin:', admin.phone, '/ admin123')
  console.log('Agent:', agent1.phone, '/ agent123')
  console.log('Player:', player1.phone, '/ player123')

  const channels = [
    { method: 'JAZZCASH' as const, accountNumber: '03714212331', accountTitle: 'ABID KHAN', instructions: 'Send to this JazzCash number and upload the receipt.' },
    { method: 'EASYPAISA' as const, accountNumber: '03366398894', accountTitle: 'AMIR SOHAIL', instructions: 'Send to this Easypaisa number and upload the receipt.' },
    { method: 'BANK' as const, accountNumber: '99480112801078', accountTitle: 'ABID KHAN', bankName: 'Meezan', instructions: 'Transfer to this bank account and upload the receipt.' },
    { method: 'WEGARS' as const, accountNumber: 'WEGARS-001', accountTitle: 'ZEE9 WEGARS', instructions: 'Pay via Wegars wallet and enter your transaction ID.' },
  ]
  for (const c of channels) {
    const exists = await prisma.paymentChannel.findFirst({ where: { accountNumber: c.accountNumber } })
    if (!exists) {
      await prisma.paymentChannel.create({
        data: { ...c, enabled: true, minAmount: P(300), maxAmount: P(100000), priority: 1 },
      })
    }
  }

  const games = [
    { slug: 'mines', title: 'Mines', emoji: '💣', color: '#3a2a15', category: 'Mini', winPct: 91, tag: 'hot', plays: 39880, ggr: P(720000), order: 1 },
  ]
  for (const g of games) {
    await prisma.game.upsert({ where: { slug: g.slug }, update: { enabled: true }, create: g as any })
  }

  await seedWheel('SPIN')
  await seedWheel('DEPOSIT')

  const tiers = [
    { name: 'Bronze', minLoss: P(1000), pct: 5, maxClaim: P(500), order: 0 },
    { name: 'Silver', minLoss: P(5000), pct: 8, maxClaim: P(2000), order: 1 },
    { name: 'Gold', minLoss: P(20000), pct: 12, maxClaim: P(8000), order: 2 },
    { name: 'Platinum', minLoss: P(50000), pct: 15, maxClaim: P(20000), order: 3 },
  ]
  if ((await prisma.cashbackTier.count()) === 0) await prisma.cashbackTier.createMany({ data: tiers })

  const marketingChannels = [
    { code: 'main', name: 'Main Channel', ownerId: agent1.id },
    { code: '14', name: 'Mentor Line 14', ownerId: agent1.id },
  ]
  for (const c of marketingChannels) {
    const exists = await prisma.channel.findUnique({ where: { code: c.code } })
    if (!exists) await prisma.channel.create({ data: c })
  }

  if ((await prisma.collectionOrder.count()) === 0) {
    const orders = [
      { type: 'DEPOSIT' as const, amount: P(20000), reward: P(400), method: 'JAZZCASH' as const, collectionAccount: '03714212331', status: 'PENDING' as const },
      { type: 'DEPOSIT' as const, amount: P(30000), reward: P(600), method: 'EASYPAISA' as const, collectionAccount: '03366398894', status: 'PENDING' as const },
    ]
    let n = 0
    for (const o of orders) {
      n++
      await prisma.collectionOrder.create({
        data: {
          orderNo: 'P' + Date.now() + n,
          type: o.type,
          amount: o.amount,
          reward: o.reward,
          agentId: agent1.id,
          playerId: player1.id,
          walletAccount: '03406305009',
          collectionAccount: o.collectionAccount,
          method: o.method,
          status: o.status,
          resolvedAt: null,
        },
      })
    }
  }

  await prisma.offer.deleteMany()
  await prisma.offer.createMany({
    data: [
      { title: '1st Deposit Bonus', desc: '10% extra on your first deposit', type: 'Deposit', reward: '+10%', enabled: true },
      { title: '2nd Deposit Bonus', desc: '7% extra on your second deposit', type: 'Deposit', reward: '+7%', enabled: true },
      { title: '3rd Deposit Bonus', desc: '5% extra on your third deposit', type: 'Deposit', reward: '+5%', enabled: true },
      { title: 'Daily Deposit Boost', desc: '7% bonus once per day after 3rd deposit', type: 'Deposit', reward: '+7%', enabled: true },
      { title: 'Weekly Cashback', desc: 'Get back a % of your daily losses', type: 'Cashback', reward: 'up to 15%', enabled: true },
      { title: 'Refer & Earn', desc: 'Agents earn 30/10/10% on player losses', type: 'Referral', reward: '30/10/10%', enabled: true },
    ],
  })

  const { DEFAULT_SETTINGS } = await import('../src/core/settings.js')
  await prisma.setting.upsert({
    where: { key: 'core' },
    update: { value: DEFAULT_SETTINGS as object },
    create: { key: 'core', value: DEFAULT_SETTINGS as object },
  })

  console.log('Seed complete ✅')
  console.log('Settings: registration Rs 150, daily check-in Rs 5, deposit bonuses 10/7/5%, commission on loss 30/10/10%')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
