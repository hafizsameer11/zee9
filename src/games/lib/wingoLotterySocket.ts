import { createGameSocket, type GameSocketHandlers } from './createGameSocket'

export type LotterySocketState = {
  roundId: string
  period: string
  phase: 'betting' | 'locked' | 'reveal'
  msLeft: number
  phaseMsLeft: number
  canBet: boolean
  result: number | null
  history: number[]
  myBets: Array<{
    id: string
    type: string
    value: number | null
    amount: number
    payout: number
    state: string
    betKey: string
  }>
  publicBets: Array<{ id: string; betKey: string; amount: number; at: string; seat?: string }>
  cellTotals?: Record<string, number>
  playersOnline?: number
  playersBetting?: number
  tableWagered?: number
  forcedPending?: boolean
  serverTime: string
}

export type LotteryPublicBetEvent = {
  id: string
  betKey: string
  amount: number
  at: string
  seat?: string
  playersOnline?: number
}

export type LotterySocketHandlers = GameSocketHandlers & {
  onState: (state: LotterySocketState) => void
  onBet?: (bet: LotteryPublicBetEvent) => void
  onPresence?: (playersOnline: number) => void
}

export function connectLotterySocket(handlers: LotterySocketHandlers) {
  return createGameSocket('/games/wingo-lottery/ws', {
    onState: handlers.onState,
    onError: handlers.onError,
    onStatus: handlers.onStatus,
    onEvent: (type, msg) => {
      if (type === 'bet' && msg.data) handlers.onBet?.(msg.data as LotteryPublicBetEvent)
      if (type === 'presence' && msg.data?.playersOnline != null) {
        handlers.onPresence?.(Number(msg.data.playersOnline))
      }
      handlers.onEvent?.(type, msg)
    },
  })
}
