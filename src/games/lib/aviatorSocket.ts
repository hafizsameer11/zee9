import { createGameSocket, type GameSocketHandlers } from './createGameSocket'

export type AviatorStateMessage = {
  type: 'state'
  data: any
}

export type AviatorSocketHandlers = GameSocketHandlers & {
  onState: (state: any) => void
}

/** Persistent Aviator WebSocket — state pushes + bet/cashout via request(). */
export function connectAviatorSocket(handlers: AviatorSocketHandlers) {
  return createGameSocket('/games/aviator/ws', handlers)
}
