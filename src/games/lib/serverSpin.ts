import { getAccess } from '../../api/client'
import { connectSlotSocket, type SlotSlug } from './slotSocket'
import type { GameSocket } from './createGameSocket'

export type { SlotSlug }

export type SlotSpinResult = {
  win: number
  bet?: number
  cost?: number
  slug?: string
  source?: string
  settlementId?: string
  credited?: boolean
  payload: Record<string, unknown>
}

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
): Promise<SlotSpinResult | null> {
  if (!getAccess()) return null
  const res = await slotSocket(slug).request<SlotSpinResult>('spin', { bet })
  return {
    win: Number(res.win ?? 0),
    bet: res.bet,
    slug: res.slug,
    source: res.source,
    payload: (res.payload || {}) as Record<string, unknown>,
  }
}

/** Feature Buy for bounty-trail / wild-bounty. Returns null if not authenticated. */
export async function serverSlotBuyFeature(
  slug: SlotSlug,
  bet: number,
): Promise<SlotSpinResult | null> {
  if (!getAccess()) return null
  const res = await slotSocket(slug).request<SlotSpinResult>('buyFeature', { bet })
  return {
    win: Number(res.win ?? 0),
    bet: res.bet,
    cost: res.cost,
    slug: res.slug,
    source: res.source,
    settlementId: res.settlementId,
    credited: res.credited,
    payload: (res.payload || {}) as Record<string, unknown>,
  }
}

/** Credit a deferred feature-buy win after the bonus animation finishes. */
export async function serverSlotCompleteFeatureBuy(
  slug: SlotSlug,
  settlementId: string,
): Promise<SlotSpinResult | null> {
  if (!getAccess()) return null
  const res = await slotSocket(slug).request<SlotSpinResult>('completeFeatureBuy', { settlementId })
  return {
    win: Number(res.win ?? 0),
    slug: res.slug,
    source: res.source,
    settlementId: res.settlementId,
    credited: res.credited,
    payload: {},
  }
}

export function isLivePlayer(): boolean {
  return !!getAccess()
}
