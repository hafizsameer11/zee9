import { createGameSocket, type GameSocketHandlers } from './createGameSocket'

export type DoubleCrashSocketHandlers = GameSocketHandlers & {
  onState: (state: any) => void
}

export function connectDoubleCrashSocket(handlers: DoubleCrashSocketHandlers) {
  return createGameSocket('/games/double-crash/ws', handlers)
}
