import { createGameSocket, type GameSocketHandlers } from './createGameSocket'
import type { BrandId } from '../car-roulette/constants/gameConfig'

export type CarRouletteSocketBet = {
  id: string
  brand: BrandId
  amount: number
  payout: number
  state: string
}

export type CarRoulettePublicBet = {
  id: string
  brand: BrandId
  amount: number
  at: string
  seat?: string
  playersOnline?: number
}

export type CarRouletteSocketState = {
  roundId: string
  period: string
  phase: 'betting' | 'locked' | 'reveal'
  msLeft: number
  canBet: boolean
  resultBrand: BrandId | null
  resultSlot: number | null
  history: Array<{ brand: BrandId; slot: number; period: string }>
  myBets: CarRouletteSocketBet[]
  myPayout: number
  publicBets: CarRoulettePublicBet[]
  cellTotals: Partial<Record<BrandId, number>>
  playersOnline: number
  playersBetting: number
  tableWagered: number
  serverTime: string
}

export type CarRouletteSocketHandlers = GameSocketHandlers & {
  onState: (state: CarRouletteSocketState) => void
  onBet?: (bet: CarRoulettePublicBet) => void
  onPresence?: (playersOnline: number) => void
}

export function connectCarRouletteSocket(handlers: CarRouletteSocketHandlers) {
  return createGameSocket('/games/car-roulette/ws', {
    onState: handlers.onState,
    onError: handlers.onError,
    onStatus: handlers.onStatus,
    onEvent: (type, msg) => {
      if (type === 'bet' && msg.data) handlers.onBet?.(msg.data as CarRoulettePublicBet)
      if (type === 'presence' && msg.data?.playersOnline != null) {
        handlers.onPresence?.(Number(msg.data.playersOnline))
      }
      handlers.onEvent?.(type, msg)
    },
  })
}
