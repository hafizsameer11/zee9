import type { UpDownChoice } from '../engines/dice'
import { CHIP_AREA, CHIP_VALUES, type ChipValue } from './constants'

const DESC = [...CHIP_VALUES].sort((a, b) => b - a) as ChipValue[]

/** Nearest chip denomination at or below `amount` (10 is the floor). */
export function chipFor(amount: number): ChipValue {
  for (const v of DESC) if (amount >= v) return v
  return CHIP_VALUES[0]
}

export function chipLabel(value: number): string {
  if (value >= 1000) return `${value / 1000}K`
  return String(value)
}

export function formatAmount(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return Math.round(n).toLocaleString('en-IN')
}

/**
 * Break a rupee total into physical chips, largest first. Capped so a huge
 * pot does not spray hundreds of sprites onto the felt.
 */
export function breakIntoChips(total: number, max = 16): ChipValue[] {
  let left = Math.floor(total)
  const out: ChipValue[] = []
  for (const v of DESC) {
    while (left >= v && out.length < max) {
      out.push(v)
      left -= v
    }
    if (out.length >= max) break
  }
  if (out.length === 0 && total > 0) out.push(CHIP_VALUES[0])
  return out
}

/** Deterministic 0..1 noise — keeps chip scatter stable across re-renders. */
function noise(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export type ChipPile = {
  key: string
  /** Percent position inside the zone plate. */
  x: number
  y: number
  chips: { value: ChipValue; rot: number }[]
}

/**
 * Lay the zone's pot out as a handful of stacked piles. Positions derive from
 * the zone id alone, so piles stay put while the pot grows.
 */
export function buildPiles(zone: UpDownChoice, total: number, maxChips = 16): ChipPile[] {
  if (total <= 0) return []
  const chips = breakIntoChips(total, maxChips)
  const area = CHIP_AREA[zone]
  const seedBase = zone === 'down' ? 11 : zone === 'seven' ? 37 : 61

  const perPile = 4
  const pileCount = Math.max(1, Math.ceil(chips.length / perPile))
  const piles: ChipPile[] = []

  for (let i = 0; i < pileCount; i++) {
    const s = seedBase + i * 7.13
    const slice = chips.slice(i * perPile, (i + 1) * perPile)
    // Spread piles across the area with jitter rather than a visible grid.
    const cols = Math.min(3, pileCount)
    const col = i % cols
    const row = Math.floor(i / cols)
    const rows = Math.ceil(pileCount / cols)
    const fx = cols === 1 ? 0.5 : (col + 0.5) / cols
    const fy = rows === 1 ? 0.55 : (row + 0.5) / rows
    piles.push({
      key: `${zone}-${i}`,
      x: area.x0 + (area.x1 - area.x0) * (fx + (noise(s) - 0.5) * 0.22),
      y: area.y0 + (area.y1 - area.y0) * (fy + (noise(s + 3) - 0.5) * 0.22),
      chips: slice.map((value, j) => ({ value, rot: (noise(s + j * 1.7) - 0.5) * 26 })),
    })
  }
  return piles
}
