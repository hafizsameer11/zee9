import { createGameSocket, type GameSocketHandlers } from './createGameSocket'

export type MinesSocketHandlers = GameSocketHandlers

export function connectMinesSocket(handlers: MinesSocketHandlers = {}) {
  return createGameSocket('/games/mines/ws', handlers)
}
