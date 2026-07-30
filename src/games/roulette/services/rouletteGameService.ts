/**
 * Roulette game API adapter — server-authoritative multiplayer.
 * Gameplay actions go over the shared roulette WebSocket.
 */
import type { BetType } from '../constants/rouletteConfig'
import { isValidRouletteNumber } from '../utils/rouletteNumbers'
import type { GameSocket } from '../../lib/createGameSocket'
import { connectRouletteSocket } from '../../lib/rouletteSocket'
import { getAccess } from '../../../api/client'

export type RoundResult = {
  winningNumber: number
  resolvedAt: string
  source: 'demo' | 'server'
}

export type PlaceRouletteBetBody = {
  type: BetType
  value?: number | null
  cellKey: string
  amount: number
}

let bound: GameSocket | null = null
let fallback: GameSocket | null = null

/** Bind the live game socket so bets share the same connection as state. */
export function bindRouletteSocket(sock: GameSocket | null) {
  bound = sock
}

function actionSocket(): GameSocket {
  if (bound) return bound
  if (!getAccess()) throw new Error('Not authenticated')
  if (!fallback) fallback = connectRouletteSocket({ onState: () => {} })
  return fallback
}

export async function placeRouletteBet(body: PlaceRouletteBetBody) {
  return actionSocket().request('bet', {
    type: body.type,
    value: body.value ?? null,
    cellKey: body.cellKey,
    amount: body.amount,
  }) as Promise<{
    betId: string
    roundId: string
    type: string
    value: number | null
    cellKey: string
    amount: number
    state: string
    betKey: string
    at: string
  }>
}

export async function revokeRouletteBets(mode: 'all' | 'last' = 'all') {
  return actionSocket().request('revoke', { mode }) as Promise<{
    revoked: number
    refunded: number
    mode: string
  }>
}

export async function fetchRouletteState() {
  throw new Error('Roulette state comes from WebSocket — do not call fetchRouletteState()')
}

export function assertValidResult(n: number): number {
  if (!isValidRouletteNumber(n)) throw new Error(`Invalid roulette result: ${n}`)
  return n
}

/** @deprecated Demo-only — kept so old imports fail loudly if misused. */
export async function getRoundResult(): Promise<RoundResult> {
  throw new Error('Roulette uses server WebSocket state — do not call getRoundResult()')
}
