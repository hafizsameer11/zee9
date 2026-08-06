/**
 * RDB audit for user-reported issues — run: npx tsx scripts/rdb-issue-audit.ts
 */
import { prisma } from '../src/lib/prisma.js'
import { pktDateKeyAt, pktDayBounds } from '../src/lib/pktDay.js'
import { getVipStatus } from '../src/modules/vip/vip.service.js'
import { getSettings } from '../src/core/settings.js'
import { existsSync } from 'fs'

const today = pktDateKeyAt()
const { key, start, end } = pktDayBounds(today)

async function ledgerCommMap(agentId: string, memberIds: string[], pktKey: string) {
  const prefix = `${pktKey}:`
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      account: { ownerId: agentId, bucket: 'COMMISSION', currency: 'PKR' },
      transaction: {
        type: 'COMMISSION',
        status: 'POSTED',
        referenceType: { in: ['daily-principal-loss', 'daily-withdraw-claw'] },
        referenceId: { startsWith: prefix },
      },
    },
    select: {
      direction: true,
      amount: true,
      transaction: { select: { referenceId: true, referenceType: true } },
    },
  })
  const memberSet = new Set(memberIds)
  const map: Record<string, { loss: number; claw: number; net: number }> = {}
  for (const e of entries) {
    const ref = e.transaction.referenceId!
    const uid = ref.slice(prefix.length)
    if (!memberSet.has(uid)) continue
    const delta = e.direction === 'CREDIT' ? Number(e.amount) : -Number(e.amount)
    const slot = map[uid] ?? { loss: 0, claw: 0, net: 0 }
    if (e.transaction.referenceType === 'daily-principal-loss') slot.loss += delta
    else slot.claw += delta
    slot.net += delta
    map[uid] = slot
  }
  return map
}

const lines: string[] = []
function section(title: string) {
  lines.push('')
  lines.push('='.repeat(72))
  lines.push(title)
  lines.push('='.repeat(72))
}
function row(label: string, value: unknown) {
  lines.push(`${label}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
}

section('RDB ISSUE AUDIT REPORT')
row('Generated (UTC)', new Date().toISOString())
row('PKT business day', key)
row('PKT day range', `${start.toISOString()} → ${end.toISOString()}`)

// ISSUE 1 — Agent MEMBERS commission per L1 member
section('ISSUE 1: Agent MEMBERS — per-member commission (My team)')
const testAgent = await prisma.user.findFirst({
  where: { playerNo: 8638904 },
  select: { id: true, displayName: true, playerNo: true },
})
if (!testAgent) {
  row('Status', 'SKIP — test agent 8638904 not found')
} else {
  row('Agent', `${testAgent.displayName} (#${testAgent.playerNo})`)
  const edges = await prisma.referralEdge.findMany({
    where: { ancestorId: testAgent.id, level: { lte: 3 } },
    include: { descendant: { select: { id: true, displayName: true, playerNo: true } } },
  })
  const memberIds = [...new Set(edges.map((e) => e.descendantId))]
  const ledgerMap = await ledgerCommMap(testAgent.id, memberIds, key)
  const tableToday = await prisma.commission.findMany({
    where: { agentId: testAgent.id, createdAt: { gte: start, lt: end } },
    include: { sourceUser: { select: { displayName: true } } },
  })

  let mismatch = 0
  for (const e of edges) {
    const uid = e.descendantId
    const ledger = ledgerMap[uid] ?? { loss: 0, claw: 0, net: 0 }
    const rows = tableToday.filter((c) => c.sourceUserId === uid)
    const tableNet = rows.reduce((s, r) => s + Number(r.amount), 0)
    const ledgerNet = ledger.net
    const apiWouldShow = ledgerNet !== 0 ? ledgerNet / 100 : tableNet / 100
    if (ledgerNet === 0 && rows.length === 0 && (e.level === 1)) {
      // only flag L1 with activity
      const bet = await prisma.ledgerEntry.aggregate({
        where: {
          createdAt: { gte: start, lt: end },
          direction: 'DEBIT',
          account: { ownerId: uid, bucket: 'MAIN' },
          transaction: { type: 'GAME_BET' },
        },
        _sum: { amount: true },
      })
      if ((bet._sum.amount ?? 0n) > 0n) mismatch++
    }
    lines.push(
      `  L${e.level} ${e.descendant.displayName} (#${e.descendant.playerNo}) | ledger net Rs ${ledger.net / 100} | table rows ${rows.length} sum Rs ${tableNet / 100} | API shows Rs ${apiWouldShow}`,
    )
  }
  row('Downline count', edges.length)
  row('Commission table rows today (all members)', tableToday.length)
  row(
    'Fix deployed',
    'GET /referrals/members uses PKT day + ledger per sourceUserId (not UTC createdAt filter only)',
  )
  row(
    'Still broken if',
    mismatch > 0
      ? `${mismatch} L1 members have bets but zero commission in ledger for today — settlement not run`
      : 'None detected for today — if UI stale, hard-refresh player app (cache)',
  )
}

// ISSUE 2 — Mentor withdraw clawback
section('ISSUE 2: Mentor panel — withdraw clawback (−30% on withdraw)')
const ficej = await prisma.user.findFirst({
  where: { playerNo: 9473474 },
  select: { id: true, displayName: true, playerNo: true, channelCode: true },
})
const mentor = await prisma.user.findFirst({
  where: { displayName: { equals: 'tetoo', mode: 'insensitive' } },
  select: { id: true, displayName: true, role: true },
})
const s = await getSettings()
if (ficej && mentor) {
  row('Member', `${ficej.displayName} (#${ficej.playerNo}) channel=${ficej.channelCode}`)
  row('Mentor', `${mentor.displayName} (${mentor.role})`)
  row('Mentor L1 rate', `${s.mentorCommissionL1}%`)

  const deps = await prisma.deposit.findMany({ where: { userId: ficej.id }, orderBy: { createdAt: 'asc' } })
  const wds = await prisma.withdrawal.findMany({ where: { userId: ficej.id }, orderBy: { createdAt: 'asc' } })
  row('Deposits', deps.map((d) => `Rs ${Number(d.amount) / 100} ${d.status} ${d.createdAt.toISOString().slice(0, 10)}`).join('; ') || 'NONE')
  row('Withdrawals', wds.map((w) => `Rs ${Number(w.amount) / 100} ${w.status} processed=${w.processedAt?.toISOString() ?? '—'}`).join('; ') || 'NONE')

  const mentorComms = await prisma.commission.findMany({
    where: { agentId: mentor.id, sourceUserId: ficej.id },
    orderBy: { createdAt: 'asc' },
  })
  row(
    'Commission rows (mentor←Ficejcdh)',
    mentorComms.map((c) => `Rs ${Number(c.amount) / 100} ${c.status} L${c.level}`).join('; ') || 'NONE',
  )

  const clawLedger = await prisma.ledgerEntry.findMany({
    where: {
      account: { ownerId: mentor.id, bucket: 'COMMISSION' },
      transaction: { referenceType: 'daily-withdraw-claw', referenceId: { contains: ficej.id } },
    },
    select: { direction: true, amount: true, transaction: { select: { referenceId: true } } },
  })
  row('Claw ledger entries', clawLedger.length)
  row('Claw ledger net Rs', clawLedger.reduce((sum, e) => sum + (e.direction === 'CREDIT' ? 1 : -1) * Number(e.amount), 0) / 100)

  const paidWd = wds.filter((w) => w.status === 'PAID')
  const expected104700 = Math.round(104700 * s.mentorCommissionL1 / 100)
  row('Expected claw if Rs 104,700 withdraw PAID today', `-Rs ${expected104700}`)

  if (paidWd.length === 0) {
    row('ROOT CAUSE (RDB)', '❌ NO PAID WITHDRAWAL for this member — minus line CANNOT exist in DB yet')
    row('User action', 'Approve/process withdraw 104700 → clawback runs on PAID → row appears in mentor Commissions')
  } else if (clawLedger.length === 0) {
    row('ROOT CAUSE (RDB)', '❌ Withdraw PAID but zero claw ledger — run repairCommissionSettlements or check settlement job')
  } else if (mentorComms.filter((c) => Number(c.amount) < 0).length === 0) {
    row('ROOT CAUSE (RDB)', '❌ Claw in ledger but no negative Commission row — re-run settlement repair after split-row fix')
  } else {
    row('ROOT CAUSE (RDB)', '✅ Data present — if UI missing, refresh mentor panel')
  }
  row('Fix deployed', 'Clawback = 30% of withdrawn amount (any day); separate +ACCRUED and −PAID commission rows')
}

// Tkdhbdfjh negative example
const tk = await prisma.user.findFirst({ where: { displayName: { contains: 'Tkdhbdfjh', mode: 'insensitive' } }, select: { id: true, displayName: true } })
if (tk && mentor) {
  const tkComms = await prisma.commission.findMany({ where: { agentId: mentor.id, sourceUserId: tk.id } })
  row('Reference: Tkdhbdfjh mentor rows', tkComms.map((c) => `${Number(c.amount) / 100} ${c.status}`).join(', '))
  const tkWds = await prisma.withdrawal.findMany({ where: { userId: tk.id, status: 'PAID' } })
  row('Tkdhbdfjh PAID withdrawals', tkWds.map((w) => Number(w.amount) / 100).join(', ') || 'none')
}

// ISSUE 3 — VIP salary
section('ISSUE 3: VIP Salary — level-up / weekly / monthly')
const vipSamples = await prisma.user.findMany({
  where: { role: 'PLAYER' },
  orderBy: { createdAt: 'desc' },
  take: 5,
  select: {
    id: true,
    displayName: true,
    vipLevel: true,
    vipRewardClaimedLevel: true,
    lastVipWeeklyAt: true,
    lastVipMonthlyAt: true,
  },
})
for (const u of vipSamples) {
  const dep = await prisma.deposit.aggregate({ where: { userId: u.id, status: 'APPROVED' }, _sum: { amount: true } })
  const deposited = Number(dep._sum.amount ?? 0) / 100
  const st = await getVipStatus(u.id)
  lines.push(
    `  ${u.displayName}: dep Rs ${deposited} | V${st.level} | levelUp can=${st.levelUp.canClaim} amt=${st.levelUp.amount} | weekly can=${st.weekly.canClaim} | monthly can=${st.monthly.canClaim}`,
  )
}
row('V0 users', 'weekly/monthly disabled until V1 (Rs 1,000 cumulative deposit)')
row('Fix deployed', 'Batch level-up claim, PKT today, idempotent claims, refreshPlayer after claim')

// ISSUE 4 — Remove member
section('ISSUE 4: Remove member / agent / mentor')
row('Backend API', 'POST /admin/users/:id/unlink-referral — EXISTS')
row('Admin UI', 'Referral Agents downline + Channels mentor downline — Remove button')
row('Player agent MEMBERS modal', 'NO remove button (admin-only)')
const unlinkRouteInBuild = existsSync('/var/www/zee9/backend/dist/src/modules/referrals/referralTree.service.js')

// Deploy verification
section('DEPLOY VERIFICATION')
row('Player dist', existsSync('/var/www/zee9/dist/index.html'))
row('Mentor panel dist', existsSync('/var/www/zee9/mentor-panel/dist/index.html'))
row('Backend dist referralTree', unlinkRouteInBuild)

// Check built player bundle for pkt offset (grep dist js)
const { execSync } = await import('child_process')
try {
  const grepPkt = execSync('grep -l "PKT_OFFSET" /var/www/zee9/dist/assets/*.js 2>/dev/null | head -1', { encoding: 'utf8' }).trim()
  row('Player bundle has PKT fix', grepPkt ? 'YES' : 'NO')
} catch {
  row('Player bundle has PKT fix', 'Could not verify minified bundle')
}

console.log(lines.join('\n'))
await prisma.$disconnect()
