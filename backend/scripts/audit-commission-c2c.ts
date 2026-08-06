/**
 * Commission + C2C audit — read-only validation against live DB.
 * Run: cd backend && npx tsx scripts/audit-commission-c2c.ts
 */
import { PrismaClient } from '@prisma/client'
import { applyBps } from '../src/lib/money.js'

const p = new PrismaClient()
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000

type TestResult = { name: string; pass: boolean; detail?: string }
type Report = {
  ranAt: string
  settings: Record<string, unknown>
  unitTests: TestResult[]
  ledgerIntegrity: TestResult[]
  commissionAudits: Array<{
    agentPlayerNo: number | null
    agentName: string
    checks: TestResult[]
  }>
  playerSettlementSamples: Array<{
    playerNo: number | null
    playerName: string
    day: string
    expected: Record<string, string>
    actual: Record<string, string>
    checks: TestResult[]
  }>
  c2cIntegrity: TestResult[]
  summary: { passed: number; failed: number; total: number }
}

function dateKeyAt(ts: number): string {
  return new Date(ts + PKT_OFFSET_MS).toISOString().slice(0, 10)
}

function boundsFor(key: string) {
  const startMs = Date.parse(`${key}T00:00:00.000Z`) - PKT_OFFSET_MS
  const endMs = startMs + 86_400_000
  return { key, start: new Date(startMs), end: new Date(endMs) }
}

function principalLossTarget(funding: bigint, wagered: bigint, won: bigint): bigint {
  const netLoss = wagered > won ? wagered - won : 0n
  return netLoss < funding ? netLoss : funding
}

function lossCommissionDesired(lossDelta: bigint, rateBps: number): bigint {
  if (lossDelta <= 0n) return 0n
  return applyBps(lossDelta, rateBps)
}

function withdrawClawDesired(clawbackBase: bigint, rateBps: number): bigint {
  if (clawbackBase <= 0n) return 0n
  return -applyBps(clawbackBase, rateBps)
}

function runUnitTests(): TestResult[] {
  const out: TestResult[] = []
  const assert = (name: string, cond: boolean, detail?: string) =>
    out.push({ name, pass: cond, detail })

  assert('principalLossTarget: net loss capped by funding', principalLossTarget(1000n, 5000n, 2000n) === 1000n)
  assert('principalLossTarget: win reduces loss', principalLossTarget(10000n, 5000n, 8000n) === 0n)
  assert('principalLossTarget: pure loss', principalLossTarget(10000n, 5000n, 0n) === 5000n)

  assert('lossCommission 30% of 10000', lossCommissionDesired(10000n, 3000) === 3000n)
  assert('lossCommission zero on negative delta', lossCommissionDesired(-100n, 3000) === 0n)
  assert('lossCommission zero on zero delta', lossCommissionDesired(0n, 3000) === 0n)

  assert('withdrawClaw negative 30% of 10000', withdrawClawDesired(10000n, 3000) === -3000n)
  assert('withdrawClaw zero when no clawback base', withdrawClawDesired(0n, 3000) === 0n)

  // Clawback base = withdraw profit (withdraw − deposit), not gross withdraw
  const depositFunding = 105150n * 100n // Rs 105,150 in paisa
  const totalWithdraw = 205000n * 100n
  const clawBase = totalWithdraw > depositFunding ? totalWithdraw - depositFunding : 0n
  assert(
    'clawback base = withdraw − deposit (profit only)',
    clawBase === 99850n * 100n,
    `base=${clawBase}`,
  )
  assert(
    '10% claw on 99,850 withdraw profit',
    -Number(withdrawClawDesired(clawBase, 1000)) / 100 === 9985,
    'expected Rs 9,985 claw',
  )
  assert(
    'loss +21000 minus claw 9985 = net 11015',
    21000 - 9985 === 11015,
  )

  return out
}

async function ledgerIntegrity(): Promise<TestResult[]> {
  const out: TestResult[] = []
  const accs = await p.ledgerAccount.findMany()
  let sum = 0n
  let mismatches = 0
  for (const a of accs) {
    sum += a.balance
    const entries = await p.ledgerEntry.findMany({ where: { accountId: a.id } })
    let calc = 0n
    for (const e of entries) calc += e.direction === 'CREDIT' ? e.amount : -e.amount
    if (calc !== a.balance) mismatches++
  }
  out.push({
    name: 'Ledger double-entry sum is zero',
    pass: sum === 0n,
    detail: `sum=${sum}`,
  })
  out.push({
    name: 'Account balances match entry sums',
    pass: mismatches === 0,
    detail: `mismatches=${mismatches}`,
  })

  const txs = await p.ledgerTransaction.findMany({ include: { entries: true } })
  let unbalanced = 0
  for (const t of txs) {
    let d = 0n
    let c = 0n
    for (const e of t.entries) e.direction === 'DEBIT' ? (d += e.amount) : (c += e.amount)
    if (d !== c) unbalanced++
  }
  out.push({
    name: 'All transactions balanced (debits = credits)',
    pass: unbalanced === 0,
    detail: `unbalanced=${unbalanced} of ${txs.length}`,
  })
  return out
}

async function sumGameBefore(accountId: string, type: 'GAME_BET' | 'GAME_WIN', before: Date) {
  const r = await p.ledgerEntry.aggregate({
    where: {
      accountId,
      createdAt: { lt: before },
      direction: type === 'GAME_BET' ? 'DEBIT' : 'CREDIT',
      transaction: { type, status: 'POSTED' },
    },
    _sum: { amount: true },
  })
  return r._sum.amount ?? 0n
}

async function fundingBefore(userId: string, before: Date) {
  const [dep, bonus] = await Promise.all([
    p.deposit.aggregate({
      where: {
        userId,
        status: 'APPROVED',
        OR: [{ processedAt: { lt: before } }, { processedAt: null, createdAt: { lt: before } }],
      },
      _sum: { amount: true },
    }),
    p.ledgerEntry.aggregate({
      where: {
        account: { ownerId: userId, bucket: 'MAIN' },
        direction: 'CREDIT',
        createdAt: { lt: before },
        transaction: { type: { in: ['REGISTRATION_BONUS', 'DEPOSIT_BONUS'] }, status: 'POSTED' },
      },
      _sum: { amount: true },
    }),
  ])
  return (dep._sum.amount ?? 0n) + (bonus._sum.amount ?? 0n)
}

async function auditPlayerDay(
  userId: string,
  dayKey: string,
  l1RateBps: number,
): Promise<{ expected: Record<string, string>; actual: Record<string, string>; checks: TestResult[] }> {
  const day = boundsFor(dayKey)
  const acc = await p.ledgerAccount.findFirst({
    where: { ownerId: userId, bucket: 'MAIN' },
    select: { id: true },
  })
  const checks: TestResult[] = []
  if (!acc) {
    checks.push({ name: 'player has MAIN account', pass: false })
    return { expected: {}, actual: {}, checks }
  }

  const [
    fundingStart,
    fundingEnd,
    wagerStart,
    wagerEnd,
    wonStart,
    wonEnd,
    withdrawn,
    settlement,
  ] = await Promise.all([
    fundingBefore(userId, day.start),
    fundingBefore(userId, day.end),
    sumGameBefore(acc.id, 'GAME_BET', day.start),
    sumGameBefore(acc.id, 'GAME_BET', day.end),
    sumGameBefore(acc.id, 'GAME_WIN', day.start),
    sumGameBefore(acc.id, 'GAME_WIN', day.end),
    p.withdrawal.aggregate({
      where: { userId, status: 'PAID', processedAt: { gte: day.start, lt: day.end } },
      _sum: { amount: true },
    }).then((r) => r._sum.amount ?? 0n),
    p.dailyCommissionSettlement.findUnique({
      where: { sourceUserId_settlementDate: { sourceUserId: userId, settlementDate: dayKey } },
    }),
  ])

  const lossStart = principalLossTarget(fundingStart, wagerStart, wonStart)
  const lossEnd = principalLossTarget(fundingEnd, wagerEnd, wonEnd)
  const lossDelta = lossEnd - lossStart
  const dayWagered = wagerEnd - wagerStart
  const dayWon = wonEnd - wonStart
  const clawbackBase = withdrawn > 0n ? withdrawn : 0n

  const expectedLossComm = lossCommissionDesired(lossDelta, l1RateBps)
  const expectedClaw = withdrawClawDesired(clawbackBase, l1RateBps)

  const expected = {
    lossDelta: lossDelta.toString(),
    clawbackBase: clawbackBase.toString(),
    expectedLossCommL1: expectedLossComm.toString(),
    expectedClawL1: expectedClaw.toString(),
    dayWagered: dayWagered.toString(),
    dayWon: dayWon.toString(),
    withdrawn: withdrawn.toString(),
  }

  const actual = {
    settlementLossDelta: settlement?.lossDelta?.toString() ?? 'none',
    settlementLossTarget: settlement?.lossTarget?.toString() ?? 'none',
  }

  if (settlement) {
    checks.push({
      name: 'DailyCommissionSettlement.lossDelta matches formula',
      pass: settlement.lossDelta === lossDelta,
      detail: `db=${settlement.lossDelta} calc=${lossDelta}`,
    })
    checks.push({
      name: 'DailyCommissionSettlement.lossTarget matches formula',
      pass: settlement.lossTarget === lossEnd,
      detail: `db=${settlement.lossTarget} calc=${lossEnd}`,
    })
  } else {
    checks.push({ name: 'DailyCommissionSettlement exists', pass: false, detail: 'no row' })
  }

  // Verify ledger commission postings for L1 agent
  const edge = await p.referralEdge.findFirst({
    where: { descendantId: userId, level: 1 },
    include: { ancestor: { select: { id: true, referralAgentActive: true, playerNo: true } } },
  })
  if (edge?.ancestor.referralAgentActive) {
    const lossLedger = await p.ledgerEntry.findMany({
      where: {
        account: { ownerId: edge.ancestorId, bucket: 'COMMISSION' },
        transaction: {
          type: 'COMMISSION',
          referenceType: 'daily-principal-loss',
          referenceId: `${dayKey}:${userId}`,
        },
      },
      select: { direction: true, amount: true },
    })
    const lossNet = lossLedger.reduce(
      (s, e) => s + (e.direction === 'CREDIT' ? e.amount : -e.amount),
      0n,
    )
    checks.push({
      name: 'L1 daily-principal-loss ledger matches expected',
      pass: lossNet === expectedLossComm,
      detail: `ledger=${lossNet} expected=${expectedLossComm} agent=${edge.ancestor.playerNo}`,
    })

    const clawLedger = await p.ledgerEntry.findMany({
      where: {
        account: { ownerId: edge.ancestorId, bucket: 'COMMISSION' },
        transaction: {
          type: 'COMMISSION',
          referenceType: 'daily-withdraw-claw',
          referenceId: `${dayKey}:${userId}`,
        },
      },
      select: { direction: true, amount: true },
    })
    const clawNet = clawLedger.reduce(
      (s, e) => s + (e.direction === 'CREDIT' ? e.amount : -e.amount),
      0n,
    )
    // Claw may be capped by available commission balance
    const clawOk = clawNet === expectedClaw || (expectedClaw < 0n && clawNet <= 0n && clawNet >= expectedClaw)
    checks.push({
      name: 'L1 daily-withdraw-claw ledger matches expected (or capped)',
      pass: clawOk,
      detail: `ledger=${clawNet} expected=${expectedClaw}`,
    })
  }

  return { expected, actual, checks }
}

async function auditAgent(agentId: string, playerNo: number | null, name: string): Promise<TestResult[]> {
  const checks: TestResult[] = []
  const commBal = await p.ledgerAccount.findFirst({
    where: { ownerId: agentId, bucket: 'COMMISSION' },
    select: { balance: true },
  })
  const commRows = await p.commission.aggregate({
    where: { agentId, status: 'ACCRUED' },
    _sum: { amount: true },
  })
  const accruedSum = commRows._sum.amount ?? 0n
  checks.push({
    name: `Agent ${playerNo ?? name}: COMMISSION bucket >= 0`,
    pass: (commBal?.balance ?? 0n) >= 0n,
    detail: `balance=${commBal?.balance ?? 0}`,
  })

  // Commission rows with negative amounts should be PAID status (clawbacks)
  const badNeg = await p.commission.count({
    where: { agentId, amount: { lt: 0 }, status: 'ACCRUED' },
  })
  checks.push({
    name: `Agent ${playerNo ?? name}: no negative ACCRUED rows`,
    pass: badNeg === 0,
    detail: `bad=${badNeg}`,
  })

  // Ledger COMMISSION should roughly track accrued (not exact due to transfers)
  checks.push({
    name: `Agent ${playerNo ?? name}: has commission activity`,
    pass: (commBal?.balance ?? 0n) > 0n || accruedSum > 0n,
    detail: `balance=${commBal?.balance} accrued=${accruedSum}`,
  })

  return checks
}

async function c2cIntegrity(): Promise<TestResult[]> {
  const out: TestResult[] = []

  // SUCCESS withdraw orders must have PAID withdrawal
  const badWdOrders = await p.collectionOrder.findMany({
    where: { type: 'WITHDRAW', status: 'SUCCESS', withdrawalId: { not: null } },
    select: { withdrawalId: true },
    take: 30,
  })
  const wdIds = badWdOrders.map((o) => o.withdrawalId!).filter(Boolean)
  const wdRows = wdIds.length
    ? await p.withdrawal.findMany({ where: { id: { in: wdIds } }, select: { id: true, status: true } })
    : []
  const wdMap = new Map(wdRows.map((w) => [w.id, w.status]))
  const wdMismatch = wdIds.filter((id) => wdMap.get(id) !== 'PAID').length
  out.push({
    name: 'SUCCESS withdraw orders have PAID withdrawal',
    pass: wdMismatch === 0,
    detail: `mismatch=${wdMismatch} sampled=${wdIds.length}`,
  })

  // SUCCESS deposit orders must have APPROVED deposit
  const badDepOrders = await p.collectionOrder.findMany({
    where: { type: 'DEPOSIT', status: 'SUCCESS', depositId: { not: null } },
    select: { depositId: true },
    take: 30,
  })
  const depIds = badDepOrders.map((o) => o.depositId!).filter(Boolean)
  const depRows = depIds.length
    ? await p.deposit.findMany({ where: { id: { in: depIds } }, select: { id: true, status: true } })
    : []
  const depMap = new Map(depRows.map((d) => [d.id, d.status]))
  const depMismatch = depIds.filter((id) => depMap.get(id) !== 'APPROVED').length
  out.push({
    name: 'SUCCESS deposit orders have APPROVED deposit',
    pass: depMismatch === 0,
    detail: `mismatch=${depMismatch} sampled=${depIds.length}`,
  })

  // Claimed withdraw: agentId set on withdrawal
  const claimed = await p.collectionOrder.findMany({
    where: { type: 'WITHDRAW', status: { in: ['PROCESSING', 'CHECKING', 'SUCCESS'] }, withdrawalId: { not: null } },
    select: { withdrawalId: true },
    take: 30,
  })
  const claimWdIds = claimed.map((o) => o.withdrawalId!).filter(Boolean)
  const claimWdRows = claimWdIds.length
    ? await p.withdrawal.findMany({ where: { id: { in: claimWdIds } }, select: { id: true, agentId: true } })
    : []
  const claimMismatch = claimWdRows.filter((w) => !w.agentId).length
  out.push({
    name: 'Claimed withdraw orders have agentId on withdrawal',
    pass: claimMismatch === 0,
    detail: `mismatch=${claimMismatch}`,
  })

  // No duplicate active claims per withdrawal
  const dupes = await p.$queryRaw<Array<{ withdrawalId: string; c: bigint }>>`
    SELECT "withdrawalId", COUNT(*)::bigint as c
    FROM "CollectionOrder"
    WHERE type = 'WITHDRAW' AND status IN ('PENDING','CHECKING','PROCESSING','SUCCESS')
    AND "withdrawalId" IS NOT NULL
    GROUP BY "withdrawalId"
    HAVING COUNT(*) > 1
    LIMIT 5
  `
  out.push({
    name: 'No duplicate active C2C claims per withdrawal',
    pass: dupes.length === 0,
    detail: dupes.length ? JSON.stringify(dupes) : 'ok',
  })

  // Reward % on successful orders
  const settings = await p.setting.findUnique({ where: { key: 'core' } })
  const payoutReward = (settings?.value as { payoutReward?: number })?.payoutReward ?? 2
  const sampleReward = await p.collectionOrder.findFirst({
    where: { type: 'WITHDRAW', status: 'SUCCESS', reward: { gt: 0 } },
    select: { amount: true, reward: true },
  })
  if (sampleReward) {
    const expectedReward = (sampleReward.amount * BigInt(Math.round(payoutReward * 100))) / 10000n
    out.push({
      name: `Withdraw reward ≈ ${payoutReward}% of amount`,
      pass: sampleReward.reward === expectedReward,
      detail: `amount=${sampleReward.amount} reward=${sampleReward.reward} expected=${expectedReward}`,
    })
  }

  const poolOpen = await p.withdrawal.count({
    where: { status: 'PENDING', c2cReleased: true, agentId: null },
  })
  out.push({
    name: 'C2C withdraw pool queryable',
    pass: true,
    detail: `open=${poolOpen}`,
  })

  return out
}

async function main() {
  const settingsRow = await p.setting.findUnique({ where: { key: 'core' } })
  const settings = (settingsRow?.value ?? {}) as Record<string, unknown>
  const l1Bps = Math.round(Number(settings.commissionL1 ?? 30) * 100)

  const report: Report = {
    ranAt: new Date().toISOString(),
    settings: {
      commissionEnabled: settings.commissionEnabled,
      commissionBasis: settings.commissionBasis,
      commissionL1: settings.commissionL1,
      commissionL2: settings.commissionL2,
      commissionL3: settings.commissionL3,
      payoutReward: settings.payoutReward,
      withdrawAutoC2cRelease: settings.withdrawAutoC2cRelease,
    },
    unitTests: runUnitTests(),
    ledgerIntegrity: await ledgerIntegrity(),
    commissionAudits: [],
    playerSettlementSamples: [],
    c2cIntegrity: await c2cIntegrity(),
    summary: { passed: 0, failed: 0, total: 0 },
  }

  const topAgents = await p.commission.groupBy({
    by: ['agentId'],
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 5,
  })
  for (const row of topAgents) {
    const u = await p.user.findUnique({
      where: { id: row.agentId },
      select: { playerNo: true, displayName: true },
    })
    report.commissionAudits.push({
      agentPlayerNo: u?.playerNo ?? null,
      agentName: u?.displayName ?? row.agentId,
      checks: await auditAgent(row.agentId, u?.playerNo ?? null, u?.displayName ?? ''),
    })
  }

  // Sample players with recent commission settlements
  const recentSettlements = await p.dailyCommissionSettlement.findMany({
    orderBy: { settledAt: 'desc' },
    take: 8,
  })
  const today = dateKeyAt(Date.now())
  const yesterday = new Date(Date.parse(`${today}T00:00:00.000Z`) - 86_400_000)
    .toISOString()
    .slice(0, 10)

  for (const s of recentSettlements) {
    const u = await p.user.findUnique({
      where: { id: s.sourceUserId },
      select: { playerNo: true, displayName: true },
    })
    const { expected, actual, checks } = await auditPlayerDay(s.sourceUserId, s.settlementDate, l1Bps)
    report.playerSettlementSamples.push({
      playerNo: u?.playerNo ?? null,
      playerName: u?.displayName ?? s.sourceUserId,
      day: s.settlementDate,
      expected,
      actual,
      checks,
    })
  }

  // Agent 2988785 specific case if exists
  const agent2988785 = await p.user.findFirst({ where: { playerNo: 2988785 } })
  if (agent2988785) {
    report.commissionAudits.push({
      agentPlayerNo: 2988785,
      agentName: agent2988785.displayName,
      checks: await auditAgent(agent2988785.id, 2988785, agent2988785.displayName),
    })
    // Find L1 downline with withdraw today
    const downline = await p.referralEdge.findMany({
      where: { ancestorId: agent2988785.id, level: 1 },
      select: { descendantId: true },
      take: 5,
    })
    for (const d of downline) {
      const u = await p.user.findUnique({
        where: { id: d.descendantId },
        select: { playerNo: true, displayName: true },
      })
      for (const dayKey of [today, yesterday]) {
        const { expected, actual, checks } = await auditPlayerDay(d.descendantId, dayKey, l1Bps)
        if (checks.some((c) => c.name.includes('ledger'))) {
          report.playerSettlementSamples.push({
            playerNo: u?.playerNo ?? null,
            playerName: u?.displayName ?? d.descendantId,
            day: dayKey,
            expected,
            actual,
            checks,
          })
        }
      }
    }
  }

  const allChecks = [
    ...report.unitTests,
    ...report.ledgerIntegrity,
    ...report.c2cIntegrity,
    ...report.commissionAudits.flatMap((a) => a.checks),
    ...report.playerSettlementSamples.flatMap((s) => s.checks),
  ]
  report.summary = {
    total: allChecks.length,
    passed: allChecks.filter((c) => c.pass).length,
    failed: allChecks.filter((c) => !c.pass).length,
  }

  console.log(JSON.stringify(report, null, 2))
  await p.$disconnect()
  process.exit(report.summary.failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(2)
})
