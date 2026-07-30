import { createGameSocket, type GameSocketHandlers } from './createGameSocket'

export type AeroXSocketHandlers = GameSocketHandlers & {
  onState: (state: any) => void
}

export function connectAeroXSocket(handlers: AeroXSocketHandlers) {
  return createGameSocket('/games/aero-x/ws', handlers)
}
