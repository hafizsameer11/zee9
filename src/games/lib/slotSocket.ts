import { createGameSocket, type GameSocketHandlers } from './createGameSocket'

export type SlotSlug =
  | 'money-coming'
  | 'fortune-gems-2'
  | 'bounty-trail'
  | 'wild-bounty'
  | 'super-ace'
  | 'double-fortune'

export type SlotSocketHandlers = GameSocketHandlers

export function connectSlotSocket(slug: SlotSlug | string, handlers: SlotSocketHandlers = {}) {
  return createGameSocket(`/games/${slug}/ws`, handlers)
}
