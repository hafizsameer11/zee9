import { createGameSocket, type GameSocketHandlers } from './createGameSocket'

export type SevenUpSocketHandlers = GameSocketHandlers & {
  onState: (state: any) => void
}

/** Persistent 7 Up Down WebSocket — server drives phase / dice / payouts. */
export function connectSevenUpSocket(handlers: SevenUpSocketHandlers) {
  return createGameSocket('/games/7up-down/ws', handlers)
}
