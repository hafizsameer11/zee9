/**
 * Verify server-authoritative slot math.
 * Usage: cd backend && npx tsx ../scripts/verify-slot-rtp.ts
 */
import {
  evaluateSpin,
  naturalEv as mcEv,
  spinMoneyComing,
} from '../backend/src/modules/games/slotMath/moneyComing.ts'
import {
  buyBountyFeature,
  evaluateFrame,
  FEATURE_BUY_MULT,
  naturalEv as btEv,
  spinBountyTrail,
} from '../backend/src/modules/games/slotMath/bountyTrail.ts'
import { lossBias } from '../backend/src/modules/games/slotMath/rtp.ts'

const WIN_PCT = 92
const SAMPLES = 120_000
const RTP_TOL_PP = 6
const BET = 10

console.log('Money Coming natural EV:', mcEv().toFixed(4))
console.log('Bounty Trail natural EV:', btEv().toFixed(4))
console.log('MC loss bias @' + WIN_PCT + '%:', lossBias(mcEv(), WIN_PCT).toFixed(4))
console.log('BT loss bias @' + WIN_PCT + '%:', lossBias(btEv(), WIN_PCT).toFixed(4))

let mcPaid = 0
let mcMismatch = 0
for (let i = 0; i < SAMPLES; i++) {
  const out = spinMoneyComing(BET, WIN_PCT)
  mcPaid += out.winRupees
  const last = out.payload.steps?.length
    ? out.payload.steps[out.payload.steps.length - 1]!
    : {
        reels: out.payload.reels,
        mult: out.payload.mult,
        win: out.payload.win,
        kind: out.winRupees > 0 ? ('match' as const) : ('none' as const),
      }
  if (last.mult === 'RESPIN') {
    mcMismatch++
    continue
  }
  const local = evaluateSpin(last.reels, last.mult, BET)
  if (local.win !== last.win || out.winRupees !== last.win) {
    mcMismatch++
    if (mcMismatch <= 3) console.error('MC mismatch', { local: local.win, last, paid: out.winRupees })
  }
}
const mcRtp = (mcPaid / (SAMPLES * BET)) * 100
console.log('MC realized RTP:', mcRtp.toFixed(2) + '%', 'mismatches:', mcMismatch)

let btPaid = 0
let btMismatch = 0
for (let i = 0; i < SAMPLES; i++) {
  const out = spinBountyTrail(BET, WIN_PCT)
  btPaid += out.winRupees
  const frame = out.payload
  const re = evaluateFrame(frame.grid, BET, 0)
  let expected: number
  if (frame.freeSpins?.length) {
    let bonus = 0
    for (const fs of frame.freeSpins) bonus += fs.totalWin
    expected =
      typeof frame.featureTotal === 'number'
        ? frame.featureTotal
        : Math.round((re.totalWin + bonus) * 100) / 100
  } else {
    expected = frame.totalWin
  }
  // Re-check base frame consistency (ways from same grid+mult path)
  if (!frame.freeSpins?.length) {
    // forced-loss path may zero the payload after evaluation
    if (out.winRupees === 0 && frame.totalWin === 0) {
      // ok
    } else if (Math.abs(re.totalWin - frame.totalWin) > 0.011 && out.winRupees !== 0) {
      // Mult index starts at 0 in both — should match unless gold frames differ in re-eval order (same)
      btMismatch++
      if (btMismatch <= 3) {
        console.error('BT base mismatch', { re: re.totalWin, frame: frame.totalWin, paid: out.winRupees })
      }
      continue
    }
  }
  if (Math.abs(expected - out.winRupees) > 0.011) {
    btMismatch++
    if (btMismatch <= 3) {
      console.error('BT total mismatch', { expected, paid: out.winRupees, fs: frame.freeSpins?.length })
    }
  }
}
const btRtp = (btPaid / (SAMPLES * BET)) * 100
console.log('BT realized RTP:', btRtp.toFixed(2) + '%', 'mismatches:', btMismatch)

let fbPaid = 0
const FB_SAMPLES = 5_000
for (let i = 0; i < FB_SAMPLES; i++) {
  fbPaid += buyBountyFeature(BET, WIN_PCT).winRupees
}
const fbCost = BET * FEATURE_BUY_MULT
const fbRtp = (fbPaid / (FB_SAMPLES * fbCost)) * 100
console.log('Feature Buy realized RTP:', fbRtp.toFixed(2) + '% (cost ' + FEATURE_BUY_MULT + 'x)')

let failed = false
if (mcMismatch > 0) {
  console.error('FAIL: Money Coming paytable mismatches')
  failed = true
}
if (btMismatch > SAMPLES * 0.002) {
  console.error('FAIL: Bounty Trail paytable mismatches')
  failed = true
}
if (Math.abs(mcRtp - WIN_PCT) > RTP_TOL_PP) {
  console.error('FAIL: MC RTP out of band', mcRtp, 'vs', WIN_PCT)
  failed = true
}
if (Math.abs(btRtp - WIN_PCT) > RTP_TOL_PP) {
  console.error('FAIL: BT RTP out of band', btRtp, 'vs', WIN_PCT)
  failed = true
}
if (Math.abs(fbRtp - WIN_PCT) > RTP_TOL_PP) {
  console.error('FAIL: Feature Buy RTP out of band', fbRtp, 'vs', WIN_PCT)
  failed = true
}
if (failed) process.exit(1)
console.log('OK: all checks passed')
