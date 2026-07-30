import { createGameSocket, type GameSocketHandlers } from './createGameSocket'

export type CrashSocketHandlers = GameSocketHandlers & {
  onState: (state: any) => void
}

export function connectCrashSocket(handlers: CrashSocketHandlers) {
  return createGameSocket('/games/crash/ws', handlers)
}
