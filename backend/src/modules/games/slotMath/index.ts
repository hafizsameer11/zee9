import { spinMoneyComing, type MoneyComingOutcome } from './moneyComing.js'
import {
  buyBountyFeature,
  spinBountyTrail,
  type BountyOutcome,
} from './bountyTrail.js'
import { spinFortuneGems2 } from './fortuneGems2.js'
import { spinDoubleFortune } from './doubleFortune.js'
import { spinSuperAce } from './superAce.js'

export type SlotMathOutcome = {
  winRupees: number
  payload: Record<string, unknown>
}

const AUTHORITATIVE = new Set([
  'money-coming',
  'bounty-trail',
  'wild-bounty',
  'fortune-gems-2',
  'double-fortune',
  'super-ace',
])

export function usesAuthoritativeMath(slug: string): boolean {
  return AUTHORITATIVE.has(slug)
}

export function spinAuthoritative(
  slug: string,
  betRupees: number,
  winPct: number,
): SlotMathOutcome {
  if (slug === 'money-coming') {
    const out: MoneyComingOutcome = spinMoneyComing(betRupees, winPct)
    return { winRupees: out.winRupees, payload: out.payload as unknown as Record<string, unknown> }
  }
  if (slug === 'bounty-trail' || slug === 'wild-bounty') {
    const out: BountyOutcome = spinBountyTrail(betRupees, winPct)
    return { winRupees: out.winRupees, payload: out.payload as unknown as Record<string, unknown> }
  }
  if (slug === 'fortune-gems-2') {
    const out = spinFortuneGems2(betRupees, winPct)
    return { winRupees: out.winRupees, payload: out.payload as unknown as Record<string, unknown> }
  }
  if (slug === 'double-fortune') {
    const out = spinDoubleFortune(betRupees, winPct)
    return { winRupees: out.winRupees, payload: out.payload as unknown as Record<string, unknown> }
  }
  if (slug === 'super-ace') {
    const out = spinSuperAce(betRupees, winPct)
    return { winRupees: out.winRupees, payload: out.payload as unknown as Record<string, unknown> }
  }
  throw new Error(`No authoritative math for ${slug}`)
}

export function buyFeatureAuthoritative(
  slug: string,
  betRupees: number,
  winPct: number,
): SlotMathOutcome {
  if (slug === 'bounty-trail' || slug === 'wild-bounty') {
    const out: BountyOutcome = buyBountyFeature(betRupees, winPct)
    return { winRupees: out.winRupees, payload: out.payload as unknown as Record<string, unknown> }
  }
  throw new Error(`Feature buy not supported for ${slug}`)
}

export { FEATURE_BUY_MULT } from './bountyTrail.js'
