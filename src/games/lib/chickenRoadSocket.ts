import { createGameSocket, type GameSocketHandlers } from './createGameSocket'

export type ChickenRoadSocketHandlers = GameSocketHandlers

export function connectChickenRoadSocket(handlers: ChickenRoadSocketHandlers = {}) {
  return createGameSocket('/games/chicken-road/ws', handlers)
}
