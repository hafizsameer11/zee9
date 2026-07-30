import { PAYOUT_MULTIPLIERS, type BetType, type RouletteBet } from '../constants/rouletteConfig'
import { colorOfNumber, columnOf, dozenOf } from './rouletteNumbers'

export function betWins(bet: RouletteBet, winningNumber: number): boolean {
  switch (bet.type) {
    case 'straight':
      return bet.selection === winningNumber
    case 'red':
      return colorOfNumber(winningNumber) === 'red'
    case 'black':
      return colorOfNumber(winningNumber) === 'black'
    case 'odd':
      return winningNumber !== 0 && winningNumber % 2 === 1
    case 'even':
      return winningNumber !== 0 && winningNumber % 2 === 0
    case 'low':
      return winningNumber >= 1 && winningNumber <= 18
    case 'high':
      return winningNumber >= 19 && winningNumber <= 36
    case 'dozen':
      return dozenOf(winningNumber) === bet.selection
    case 'column':
      return columnOf(winningNumber) === bet.selection
    default:
      return false
  }
}

/**
 * Total credit for a winning bet = stake + (stake * multiplier).
 * Losing bets return 0.
 */
export function payoutForBet(bet: RouletteBet, winningNumber: number): number {
  if (!betWins(bet, winningNumber)) return 0
  const mult = PAYOUT_MULTIPLIERS[bet.type as BetType] ?? 0
  return Math.round((bet.amount + bet.amount * mult) * 100) / 100
}

export function totalPayout(bets: RouletteBet[], winningNumber: number): number {
  return Math.round(bets.reduce((sum, b) => sum + payoutForBet(b, winningNumber), 0) * 100) / 100
}

export function totalStake(bets: RouletteBet[]): number {
  return Math.round(bets.reduce((sum, b) => sum + b.amount, 0) * 100) / 100
}

/** Potential win if all current bets hit (sum of each bet's full credit). Used as UI estimate. */
export function potentialWin(bets: RouletteBet[]): number {
  return Math.round(
    bets.reduce((sum, b) => {
      const mult = PAYOUT_MULTIPLIERS[b.type] ?? 0
      return sum + b.amount + b.amount * mult
    }, 0) * 100,
  ) / 100
}

export type CellAggregate = {
  cellKey: string
  amount: number
  lastChip: number
}

export function aggregateByCell(bets: RouletteBet[]): Map<string, CellAggregate> {
  const map = new Map<string, CellAggregate>()
  for (const b of bets) {
    const prev = map.get(b.cellKey)
    if (prev) {
      prev.amount += b.amount
      prev.lastChip = b.chipValue
    } else {
      map.set(b.cellKey, { cellKey: b.cellKey, amount: b.amount, lastChip: b.chipValue })
    }
  }
  return map
}
