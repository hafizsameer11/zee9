import { compareCards, isValidCard, makeCard } from '../utils/cardUtils'
import type { PlayingCard, Winner, BetSelection } from '../constants/gameConfig'
import type { Suit, Rank } from '../constants/gameConfig'
import { getAccess } from '../../../api/client'
import type { GameSocket } from '../../lib/createGameSocket'
import { connectDragonTigerSocket } from '../../lib/dragonTigerSocket'

export type RoundResult = {
  roundId: string
  dragonCard: PlayingCard
  tigerCard: PlayingCard
  winner: Winner
  resolvedAt: string
  source: 'demo' | 'server'
}

let bound: GameSocket | null = null
let fallback: GameSocket | null = null

export function bindDragonTigerSocket(sock: GameSocket | null) {
  bound = sock
}

function actionSocket(): GameSocket {
  if (bound) return bound
  if (!getAccess()) throw new Error('Not authenticated')
  if (!fallback) fallback = connectDragonTigerSocket({ onState: () => {} })
  return fallback
}

/** Place a live bet over WebSocket. */
export async function placeServerBet(selection: BetSelection, amount: number): Promise<boolean> {
  if (!getAccess()) throw new Error('Not authenticated')
  await actionSocket().request('bet', { side: selection, amount })
  return true
}

/** Demo RNG removed — RequireAuth means live socket state drives results. */
export async function getRoundResult(): Promise<RoundResult> {
  throw new Error('Not authenticated — Dragon Tiger requires a live WebSocket session')
}

export function assertValidResult(result: RoundResult): RoundResult {
  if (!isValidCard(result.dragonCard) || !isValidCard(result.tigerCard)) {
    throw new Error('Invalid card in round result')
  }
  const expected = compareCards(result.dragonCard, result.tigerCard)
  if (result.winner !== expected) {
    throw new Error(`Winner mismatch: got ${result.winner}, expected ${expected}`)
  }
  if (!result.roundId) throw new Error('Missing roundId')
  return result
}

export function buildForcedResult(
  dragon: { rank: Rank; suit: Suit },
  tiger: { rank: Rank; suit: Suit },
): RoundResult {
  const dragonCard = makeCard(dragon.rank, dragon.suit)
  const tigerCard = makeCard(tiger.rank, tiger.suit)
  return {
    roundId: `dt-force-${Date.now()}`,
    dragonCard,
    tigerCard,
    winner: compareCards(dragonCard, tigerCard),
    resolvedAt: new Date().toISOString(),
    source: 'demo',
  }
}
