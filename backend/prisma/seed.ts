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

async function nextPlayerNo(): Promise<number> {
  const agg = await prisma.user.aggregate({ _max: { playerNo: true } })
  const base = agg._max.playerNo ?? 1_000_000
  return base + 1 + Math.floor(Math.random() * 900)
}

async function upsertUser(opts: {
  phone: string
  password: string
  displayName: string
  role: 'PLAYER' | 'AGENT' | 'MENTOR' | 'ADMIN'
  referredById?: string | null
  agentActive?: boolean
  referralAgentActive?: boolean
}) {
  const passwordHash = await bcrypt.hash(opts.password, 10)
  const existing = await prisma.user.findUnique({ where: { phone: opts.phone }, select: { playerNo: true } })
  const playerNo = existing?.playerNo ?? (await nextPlayerNo())
  const user = await prisma.user.upsert({
    where: { phone: opts.phone },
    update: {
      role: opts.role,
      ...(opts.agentActive !== undefined ? { agentActive: opts.agentActive } : {}),
      ...(opts.referralAgentActive !== undefined ? { referralAgentActive: opts.referralAgentActive } : {}),
    },
    create: {
      phone: opts.phone,
      passwordHash,
      displayName: opts.displayName,
      role: opts.role,
      playerNo,
      referralCode: code(),
      referredById: opts.referredById ?? null,
      agentActive: opts.agentActive ?? false,
      referralAgentActive: opts.referralAgentActive ?? false,
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
  await prisma.wheelSpin.deleteMany({ where: { prize: { wheel } } })
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
  const refAgent = await upsertUser({
    phone: '03005555555',
    password: 'refagent123',
    displayName: 'Referral Agent',
    role: 'PLAYER',
    referralAgentActive: true,
    agentActive: false,
  })
  const mentor = await upsertUser({
    phone: '03006666666',
    password: 'mentor123',
    displayName: 'Channel Mentor',
    role: 'MENTOR',
  })
  const player1 = await upsertUser({ phone: '03003333333', password: 'player123', displayName: 'Player_289005', role: 'PLAYER', referredById: refAgent.id })
  const player2 = await upsertUser({ phone: '03004444444', password: 'player123', displayName: 'Zee9_King', role: 'PLAYER', referredById: refAgent.id })

  for (const p of [player1, player2]) {
    await prisma.referralEdge.upsert({
      where: { ancestorId_descendantId: { ancestorId: refAgent.id, descendantId: p.id } },
      update: {},
      create: { ancestorId: refAgent.id, descendantId: p.id, level: 1 },
    })
  }

  const mentorChannel = await prisma.channel.upsert({
    where: { code: 'ch1' },
    update: { ownerId: mentor.id, name: 'Channel 1', enabled: true },
    create: { code: 'ch1', name: 'Channel 1', ownerId: mentor.id, enabled: true },
  })
  await prisma.user.updateMany({
    where: { id: { in: [player1.id, player2.id, refAgent.id] } },
    data: { channelCode: mentorChannel.code },
  })

  console.log('Admin:', admin.phone, '/ admin123')
  console.log('C2C merchant:', agent1.phone, '/ agent123')
  console.log('Referral agent:', refAgent.phone, '/ refagent123')
  console.log('Mentor:', mentor.phone, '/ mentor123')
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
    { slug: 'mines', title: 'Mines', emoji: '💣', color: '#3a2a15', category: 'Mini', winPct: 91, tag: 'hot', plays: 0, ggr: 0n, order: 1 },
    { slug: 'aviator', title: 'Aviator', emoji: '✈️', color: '#1a1020', category: 'Crash', winPct: 97, tag: 'hot', plays: 0, ggr: 0n, order: 2 },
    { slug: 'crash', title: 'Crash', emoji: '🚀', color: '#2a1a0a', category: 'Crash', winPct: 97, tag: 'hot', plays: 0, ggr: 0n, order: 3 },
    { slug: 'aero-x', title: 'AeroX', emoji: '🛸', color: '#0a1a2a', category: 'Crash', winPct: 97, tag: 'hot', plays: 0, ggr: 0n, order: 4 },
    { slug: 'double-crash', title: 'Double Crash', emoji: '🚀', color: '#1a0a2a', category: 'Crash', winPct: 97, tag: 'hot', plays: 0, ggr: 0n, order: 5 },
    { slug: 'wingo', title: 'WinGo', emoji: '🎱', color: '#0d8a5f', category: 'Lottery', winPct: 90, tag: 'hot', plays: 0, ggr: 0n, order: 6 },
    { slug: 'wingo-lottery', title: 'WinGo Lottery', emoji: '🎯', color: '#0a5a62', category: 'Lottery', winPct: 90, tag: 'hot', plays: 0, ggr: 0n, order: 7 },
    { slug: 'roulette', title: 'Roulette', emoji: '🎡', color: '#0a3d2e', category: 'Table', winPct: 90, tag: 'hot', plays: 0, ggr: 0n, order: 8 },
    { slug: 'dragon-tiger', title: 'Dragon Tiger', emoji: '🐉', color: '#8a2410', category: 'Table', winPct: 93, tag: 'new', plays: 0, ggr: 0n, order: 9 },
    { slug: '7up-down', title: '7 Up Down', emoji: '🎲', color: '#1d5c2e', category: 'Table', winPct: 89, plays: 0, ggr: 0n, order: 10 },
    { slug: 'chicken-road', title: 'Chicken Road', emoji: '🐔', color: '#1b4332', category: 'Mini', winPct: 92, tag: 'hot', plays: 0, ggr: 0n, order: 11 },
    { slug: 'money-coming', title: 'Money Coming', emoji: '💵', color: '#2e7d32', category: 'Slots', winPct: 94, tag: 'hot', plays: 0, ggr: 0n, order: 12 },
    { slug: 'fortune-gems-2', title: 'Fortune Gems 2', emoji: '💎', color: '#7b1f2b', category: 'Slots', winPct: 92, tag: 'hot', plays: 0, ggr: 0n, order: 13 },
    { slug: 'bounty-trail', title: 'Bounty Trail', emoji: '🤠', color: '#d84315', category: 'Slots', winPct: 93, tag: 'new', plays: 0, ggr: 0n, order: 14 },
    { slug: 'wild-bounty', title: 'Wild Bounty', emoji: '🤠', color: '#bf360c', category: 'Slots', winPct: 93, plays: 0, ggr: 0n, order: 15 },
    { slug: 'super-ace', title: 'Super Ace', emoji: '🂡', color: '#6a1b9a', category: 'Slots', winPct: 94, tag: 'hot', plays: 0, ggr: 0n, order: 16 },
    { slug: 'double-fortune', title: 'Double Fortune', emoji: '囍', color: '#8b0000', category: 'Slots', winPct: 94, tag: 'new', plays: 0, ggr: 0n, order: 17 },
  ]
  for (const g of games) {
    await prisma.game.upsert({
      where: { slug: g.slug },
      // Clear any previously seeded fake plays/revenue on re-seed
      update: { enabled: true, title: g.title, emoji: g.emoji, plays: 0, ggr: 0n },
      create: g as any,
    })
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
    { code: 'main', name: 'Main Channel', ownerId: mentor.id },
    { code: '14', name: 'Mentor Line 14', ownerId: mentor.id },
  ]
  for (const c of marketingChannels) {
    const exists = await prisma.channel.findUnique({ where: { code: c.code } })
    if (!exists) await prisma.channel.create({ data: c })
  }

  // ---- C2C merchants + JazzCash / EasyPaisa account numbers ----
  const agent2 = await upsertUser({
    phone: '03007777777',
    password: 'agent123',
    displayName: 'Hamza Merchant',
    role: 'AGENT',
    agentActive: true,
  })
  const agent3 = await upsertUser({
    phone: '03008888888',
    password: 'agent123',
    displayName: 'Sara Merchant',
    role: 'AGENT',
    agentActive: true,
  })

  const merchantAccounts: {
    userId: string
    method: 'JAZZCASH' | 'EASYPAISA'
    number: string
    holder: string
    enabled: boolean
  }[] = [
    { userId: agent1.id, method: 'JAZZCASH', number: '03001111111', holder: 'Adnan Ali', enabled: true },
    { userId: agent1.id, method: 'EASYPAISA', number: '03001111222', holder: 'Adnan Ali', enabled: true },
    { userId: agent2.id, method: 'JAZZCASH', number: '03007777111', holder: 'Hamza Merchant', enabled: true },
    { userId: agent2.id, method: 'EASYPAISA', number: '03007777222', holder: 'Hamza Merchant', enabled: true },
    { userId: agent3.id, method: 'JAZZCASH', number: '03008888111', holder: 'Sara Merchant', enabled: true },
    { userId: agent3.id, method: 'EASYPAISA', number: '03008888222', holder: 'Sara Merchant', enabled: false },
  ]

  const agentAccByKey = new Map<string, { id: string; number: string; method: string; userId: string }>()
  for (const a of merchantAccounts) {
    const existing = await prisma.agentAccount.findFirst({
      where: { userId: a.userId, number: a.number },
    })
    const row =
      existing ??
      (await prisma.agentAccount.create({
        data: {
          userId: a.userId,
          method: a.method,
          number: a.number,
          holder: a.holder,
          enabled: a.enabled,
          awaitingReview: false,
        },
      }))
    if (existing) {
      await prisma.agentAccount.update({
        where: { id: existing.id },
        data: { enabled: a.enabled, awaitingReview: false, holder: a.holder, method: a.method },
      })
    }
    agentAccByKey.set(`${a.userId}:${a.method}`, {
      id: row.id,
      number: a.number,
      method: a.method,
      userId: a.userId,
    })
  }

  const { runMoneyTx } = await import('../src/core/tx.js')
  const { post } = await import('../src/core/ledger.js')

  async function creditMain(userId: string, rupees: number, key: string, type: 'ADMIN_ADJUST' | 'DEPOSIT' = 'ADMIN_ADJUST') {
    const amount = P(rupees)
    await runMoneyTx(async (tx) => {
      await post(tx, {
        type,
        idempotencyKey: key,
        legs: [
          { account: { system: 'GATEWAY_CLEARING' }, direction: 'DEBIT', amount },
          { account: { userId, bucket: 'MAIN' }, direction: 'CREDIT', amount },
        ],
      })
    })
  }

  await creditMain(agent1.id, 85000, 'seed-agent1-float')
  await creditMain(agent2.id, 42000, 'seed-agent2-float')
  await creditMain(agent3.id, 28000, 'seed-agent3-float')
  await creditMain(player1.id, 5000, 'seed-player1-wallet')
  await creditMain(player2.id, 2500, 'seed-player2-wallet')

  const daysAgo = (n: number, hour = 12) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    d.setHours(hour, 15, 0, 0)
    return d
  }

  // Demo deposits + C2C collection orders (idempotent by orderNo)
  const demoOrders: {
    orderNo: string
    agentId: string
    playerId: string
    amount: number
    reward: number
    method: 'JAZZCASH' | 'EASYPAISA'
    collectionAccount: string
    agentAccountId: string
    status: 'PENDING' | 'SUCCESS' | 'FAIL' | 'CHECKING'
    type: 'DEPOSIT' | 'WITHDRAW'
    createdAt: Date
    trxId?: string
  }[] = [
    {
      orderNo: 'SEED-DEP-TODAY-1',
      agentId: agent1.id,
      playerId: player1.id,
      amount: 5000,
      reward: 100,
      method: 'JAZZCASH',
      collectionAccount: '03001111111',
      agentAccountId: agentAccByKey.get(`${agent1.id}:JAZZCASH`)!.id,
      status: 'SUCCESS',
      type: 'DEPOSIT',
      createdAt: daysAgo(0, 10),
      trxId: 'JC1001',
    },
    {
      orderNo: 'SEED-DEP-TODAY-2',
      agentId: agent1.id,
      playerId: player2.id,
      amount: 2000,
      reward: 40,
      method: 'EASYPAISA',
      collectionAccount: '03001111222',
      agentAccountId: agentAccByKey.get(`${agent1.id}:EASYPAISA`)!.id,
      status: 'PENDING',
      type: 'DEPOSIT',
      createdAt: daysAgo(0, 14),
      trxId: 'EP2001',
    },
    {
      orderNo: 'SEED-DEP-WEEK-1',
      agentId: agent1.id,
      playerId: player1.id,
      amount: 10000,
      reward: 200,
      method: 'JAZZCASH',
      collectionAccount: '03001111111',
      agentAccountId: agentAccByKey.get(`${agent1.id}:JAZZCASH`)!.id,
      status: 'SUCCESS',
      type: 'DEPOSIT',
      createdAt: daysAgo(3, 11),
      trxId: 'JC3001',
    },
    {
      orderNo: 'SEED-DEP-MONTH-1',
      agentId: agent1.id,
      playerId: player2.id,
      amount: 15000,
      reward: 300,
      method: 'EASYPAISA',
      collectionAccount: '03001111222',
      agentAccountId: agentAccByKey.get(`${agent1.id}:EASYPAISA`)!.id,
      status: 'SUCCESS',
      type: 'DEPOSIT',
      createdAt: daysAgo(12, 16),
      trxId: 'EP4001',
    },
    {
      orderNo: 'SEED-WD-TODAY-1',
      agentId: agent1.id,
      playerId: player1.id,
      amount: 3000,
      reward: 60,
      method: 'JAZZCASH',
      collectionAccount: '03401234567',
      agentAccountId: agentAccByKey.get(`${agent1.id}:JAZZCASH`)!.id,
      status: 'SUCCESS',
      type: 'WITHDRAW',
      createdAt: daysAgo(0, 18),
      trxId: 'WD5001',
    },
    {
      orderNo: 'SEED-DEP-HAMZA-1',
      agentId: agent2.id,
      playerId: player1.id,
      amount: 8000,
      reward: 160,
      method: 'JAZZCASH',
      collectionAccount: '03007777111',
      agentAccountId: agentAccByKey.get(`${agent2.id}:JAZZCASH`)!.id,
      status: 'PENDING',
      type: 'DEPOSIT',
      createdAt: daysAgo(0, 9),
      trxId: 'JC6001',
    },
    {
      orderNo: 'SEED-DEP-SARA-1',
      agentId: agent3.id,
      playerId: player2.id,
      amount: 4500,
      reward: 90,
      method: 'JAZZCASH',
      collectionAccount: '03008888111',
      agentAccountId: agentAccByKey.get(`${agent3.id}:JAZZCASH`)!.id,
      status: 'CHECKING',
      type: 'DEPOSIT',
      createdAt: daysAgo(1, 13),
      trxId: 'JC7001',
    },
  ]

  for (const o of demoOrders) {
    const exists = await prisma.collectionOrder.findUnique({ where: { orderNo: o.orderNo } })
    if (exists) continue

    let depositId: string | undefined
    let withdrawalId: string | undefined

    if (o.type === 'DEPOSIT') {
      const dep = await prisma.deposit.create({
        data: {
          userId: o.playerId,
          amount: P(o.amount),
          method: o.method,
          agentAccountId: o.agentAccountId,
          agentId: o.agentId,
          trxId: o.trxId,
          status: o.status === 'SUCCESS' ? 'APPROVED' : o.status === 'FAIL' ? 'REJECTED' : 'PENDING',
          createdAt: o.createdAt,
          processedAt: o.status === 'SUCCESS' ? o.createdAt : null,
        },
      })
      depositId = dep.id
      if (o.status === 'SUCCESS') {
        await creditMain(o.playerId, o.amount, `seed-credit-${o.orderNo}`, 'DEPOSIT')
      }
    } else {
      const wd = await prisma.withdrawal.create({
        data: {
          userId: o.playerId,
          amount: P(o.amount),
          method: o.method,
          accountDetails: { title: 'Player Wallet', number: o.collectionAccount },
          agentId: o.agentId,
          trxId: o.trxId,
          status: o.status === 'SUCCESS' ? 'PAID' : 'PENDING',
          wagerOk: true,
          createdAt: o.createdAt,
          processedAt: o.status === 'SUCCESS' ? o.createdAt : null,
        },
      })
      withdrawalId = wd.id
    }

    await prisma.collectionOrder.create({
      data: {
        orderNo: o.orderNo,
        type: o.type,
        amount: P(o.amount),
        reward: P(o.reward),
        agentId: o.agentId,
        playerId: o.playerId,
        walletAccount: '03406305009',
        collectionAccount: o.collectionAccount,
        method: o.method,
        status: o.status,
        depositId: depositId ?? null,
        withdrawalId: withdrawalId ?? null,
        trxId: o.trxId ?? null,
        createdAt: o.createdAt,
        resolvedAt: o.status === 'SUCCESS' || o.status === 'FAIL' ? o.createdAt : null,
        payeeName: o.type === 'WITHDRAW' ? 'Player Wallet' : null,
        payeeBank: o.type === 'WITHDRAW' ? o.method : null,
      },
    })
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
  console.log('C2C merchants:')
  console.log('  Adnan  03001111111 / agent123  JC:03001111111 EP:03001111222')
  console.log('  Hamza  03007777777 / agent123  JC:03007777111 EP:03007777222')
  console.log('  Sara   03008888888 / agent123  JC:03008888111 EP:03008888222')
  console.log('Settings: registration Rs 150, daily check-in Rs 5, deposit bonuses 10/7/5%, commission on loss 30/10/10%')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
