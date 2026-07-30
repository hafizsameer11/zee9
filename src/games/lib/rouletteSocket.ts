import { createGameSocket, type GameSocketHandlers } from './createGameSocket'

export type RouletteSocketSeat = {
  id: string
  name: string
  seat: string
  avatar: number
  balance: number
}

export type RouletteSocketBet = {
  id: string
  type: string
  value: number | null
  cellKey: string
  amount: number
  payout: number
  state: string
}

export type RouletteSocketState = {
  roundId: string
  period: string
  phase: 'betting' | 'locked' | 'reveal'
  msLeft: number
  canBet: boolean
  result: number | null
  history: number[]
  myBets: RouletteSocketBet[]
  myPayout: number
  publicBets: Array<{ id: string; betKey: string; amount: number; at: string; seat?: string }>
  cellTotals?: Record<string, number>
  seats?: RouletteSocketSeat[]
  playersOnline?: number
  playersBetting?: number
  tableWagered?: number
  forcedPending?: boolean
  serverTime: string
}

export type RoulettePublicBetEvent = {
  id: string
  betKey: string
  amount: number
  at: string
  seat?: string
  playersOnline?: number
}

export type RouletteSocketHandlers = GameSocketHandlers & {
  onState: (state: RouletteSocketState) => void
  onBet?: (bet: RoulettePublicBetEvent) => void
  onPresence?: (playersOnline: number) => void
}

export function connectRouletteSocket(handlers: RouletteSocketHandlers) {
  return createGameSocket('/games/roulette/ws', {
    onState: handlers.onState,
    onError: handlers.onError,
    onStatus: handlers.onStatus,
    onEvent: (type, msg) => {
      if (type === 'bet' && msg.data) handlers.onBet?.(msg.data as RoulettePublicBetEvent)
      if (type === 'presence' && msg.data?.playersOnline != null) {
        handlers.onPresence?.(Number(msg.data.playersOnline))
      }
      handlers.onEvent?.(type, msg)
    },
  })
}
