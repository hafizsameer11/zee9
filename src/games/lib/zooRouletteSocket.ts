import { createGameSocket, type GameSocketHandlers } from './createGameSocket'
import type { AnimalId, BetZoneId } from '../zoo-roulette/constants/gameConfig'

export type ZooRouletteSocketBet = {
  id: string
  zone: BetZoneId
  amount: number
  payout: number
  state: string
}

export type ZooRoulettePublicBet = {
  id: string
  zone: BetZoneId
  amount: number
  at: string
  seat?: string
  playersOnline?: number
}

export type ZooRouletteSocketState = {
  roundId: string
  period: string
  phase: 'betting' | 'locked' | 'reveal'
  msLeft: number
  canBet: boolean
  resultAnimal: AnimalId | null
  resultSlot: number | null
  history: Array<{ animal: AnimalId; slot: number; period: string }>
  myBets: ZooRouletteSocketBet[]
  myPayout: number
  publicBets: ZooRoulettePublicBet[]
  cellTotals: Partial<Record<BetZoneId, number>>
  playersOnline: number
  playersBetting: number
  tableWagered: number
  serverTime: string
}

export type ZooRouletteSocketHandlers = GameSocketHandlers & {
  onState: (state: ZooRouletteSocketState) => void
  onBet?: (bet: ZooRoulettePublicBet) => void
  onPresence?: (playersOnline: number) => void
}

export function connectZooRouletteSocket(handlers: ZooRouletteSocketHandlers) {
  return createGameSocket('/games/zoo-roulette/ws', {
    onState: handlers.onState,
    onError: handlers.onError,
    onStatus: handlers.onStatus,
    onEvent: (type, msg) => {
      if (type === 'bet' && msg.data) handlers.onBet?.(msg.data as ZooRoulettePublicBet)
      if (type === 'presence' && msg.data?.playersOnline != null) {
        handlers.onPresence?.(Number(msg.data.playersOnline))
      }
      handlers.onEvent?.(type, msg)
    },
  })
}
