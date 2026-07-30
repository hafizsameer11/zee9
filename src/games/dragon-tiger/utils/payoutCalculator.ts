import type { BetSelection, DragonTigerBet } from '../constants/gameConfig'
import { payoutForBet } from './cardUtils'

export type ZoneAggregate = {
  selection: BetSelection
  amount: number
  lastChip: number
}

export function totalStake(bets: DragonTigerBet[]): number {
  return Math.round(bets.reduce((s, b) => s + b.amount, 0) * 100) / 100
}

export function aggregateByZone(bets: DragonTigerBet[]): Map<BetSelection, ZoneAggregate> {
  const map = new Map<BetSelection, ZoneAggregate>()
  for (const b of bets) {
    const cur = map.get(b.selection)
    if (cur) {
      cur.amount += b.amount
      cur.lastChip = b.chipValue
    } else {
      map.set(b.selection, {
        selection: b.selection,
        amount: b.amount,
        lastChip: b.chipValue,
      })
    }
  }
  return map
}

export function potentialWin(bets: DragonTigerBet[]): number {
  // Max single-zone total return among current bets (demo display)
  const by = aggregateByZone(bets)
  let best = 0
  for (const [sel, agg] of by) {
    best = Math.max(best, payoutForBet(sel, agg.amount))
  }
  return best
}

export function totalPayout(bets: DragonTigerBet[], winner: BetSelection): number {
  let sum = 0
  for (const b of bets) {
    if (b.selection === winner) sum += payoutForBet(b.selection, b.amount)
  }
  return Math.round(sum * 100) / 100
}

export function zoneAmount(bets: DragonTigerBet[], selection: BetSelection): number {
  return bets.filter((b) => b.selection === selection).reduce((s, b) => s + b.amount, 0)
}
