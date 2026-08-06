/** Pakistan (UTC+5) calendar day helpers — business day for commissions & team stats. */
export const PKT_OFFSET_MS = 5 * 60 * 60 * 1000

export function pktDateKeyAt(timestamp = Date.now()): string {
  return new Date(timestamp + PKT_OFFSET_MS).toISOString().slice(0, 10)
}

export type PktDayBounds = { key: string; start: Date; end: Date; displayAt: Date }

export function pktDayBounds(dateStr?: string): PktDayBounds {
  const key = dateStr?.trim() || pktDateKeyAt()
  const startMs = Date.parse(`${key}T00:00:00.000Z`) - PKT_OFFSET_MS
  const endMs = startMs + 86_400_000
  return {
    key,
    start: new Date(startMs),
    end: new Date(endMs),
    displayAt: new Date(endMs - 1_000),
  }
}
