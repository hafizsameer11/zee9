import { getAccess } from '../../api/client'
import { connectSlotSocket, type SlotSlug } from './slotSocket'
import type { GameSocket } from './createGameSocket'

export type { SlotSlug }

const sockets = new Map<string, GameSocket>()

function slotSocket(slug: SlotSlug): GameSocket {
  let sock = sockets.get(slug)
  if (!sock) {
    sock = connectSlotSocket(slug)
    sockets.set(slug, sock)
  }
  return sock
}

/** Open the live socket while the game screen is loading, before the first spin. */
export function preconnectSlot(slug: SlotSlug) {
  if (getAccess()) slotSocket(slug)
}

/** When logged in, settle a slot spin over WebSocket. Returns null if not authenticated. */
export async function serverSlotSpin(
  slug: SlotSlug,
  bet: number,
): Promise<{ win: number; payload: any } | null> {
  if (!getAccess()) return null
  const res = await slotSocket(slug).request<{ win?: number; payload?: any }>('spin', { bet })
  return { win: Number(res.win ?? 0), payload: res.payload }
}

export function isLivePlayer(): boolean {
  return !!getAccess()
}
