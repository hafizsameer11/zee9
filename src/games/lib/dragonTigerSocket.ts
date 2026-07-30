import { createGameSocket, type GameSocketHandlers } from './createGameSocket'

export type DragonTigerSocketCard = {
  rank: string
  suit: string
  value: number
  id: string
}

export type DragonTigerSocketBet = {
  id: string
  side: 'dragon' | 'tiger' | 'tie'
  amount: number
  payout: number
  state: string
}

export type DragonTigerSocketState = {
  roundId: string | null
  period: string | null
  phase: 'betting' | 'locked' | 'reveal'
  msLeft: number
  canBet: boolean
  winner: 'dragon' | 'tiger' | 'tie' | null
  dragonCard: DragonTigerSocketCard | null
  tigerCard: DragonTigerSocketCard | null
  history: Array<'dragon' | 'tiger' | 'tie'>
  myBets: DragonTigerSocketBet[]
  myPayout: number
  zoneTotals: { dragon: number; tiger: number; tie: number }
  playersOnline: number
  forcedPending?: boolean
  serverTime: string
}

export type DragonTigerSocketHandlers = GameSocketHandlers & {
  onState: (state: DragonTigerSocketState) => void
  onHello?: (balance: number) => void
}

export function connectDragonTigerSocket(handlers: DragonTigerSocketHandlers) {
  return createGameSocket('/games/dragon-tiger/ws', {
    onState: handlers.onState,
    onError: handlers.onError,
    onStatus: handlers.onStatus,
    onEvent: (type, msg) => {
      if (type === 'hello' && msg.data?.balance != null) {
        handlers.onHello?.(Number(msg.data.balance))
      }
      handlers.onEvent?.(type, msg)
    },
  })
}
