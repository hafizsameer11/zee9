import type { JhandiSymbol } from '../engines/dice'
import { CHIP_VALUES, SYMBOL_ORDER, type ChipValue } from './constants'

const B = '/games/jhandi-munda'
const V2 = `${B}/v2`

function w(rel: string): string {
  const base = rel.replace(/\.(png|webp)$/, '')
  return `${V2}/${base}.webp`
}

export const IMG = {
  tableFrame: w('ui/table-frame.png'),
  timer: w('ui/timer.png'),
  cup: w('dice/cup-sm.png'),
  dealerIdle: w('dealer/idle.png'),
  placeBets: w('banners/place-bets.png'),
  stopBetting: w('banners/stop-betting.png'),
  btnBack: w('ui/btn-back.png'),
} as const

export const CHIP_IMG: Record<ChipValue, string> = Object.fromEntries(
  CHIP_VALUES.map((v) => [v, w(`chips/chip-${v}.png`)]),
) as Record<ChipValue, string>

export const CHIP_IMG_SM: Record<ChipValue, string> = Object.fromEntries(
  CHIP_VALUES.map((v) => [v, w(`chips/chip-${v}-sm.png`)]),
) as Record<ChipValue, string>

/** Large watermark symbol inside each betting box. */
export function symbolWatermark(sym: JhandiSymbol): string {
  return w(`dice/face-${sym}-sm.png`)
}

export function diceFace(sym: JhandiSymbol): string {
  return w(`dice/face-${sym}-sm.png`)
}

export function historyCount(n: number): string {
  return w(`history/count-${Math.min(6, Math.max(0, n))}.png`)
}

export function avatarImg(i: number): string {
  return w(`avatars/player-${i % 6}.png`)
}

export const SND = {
  roll: `${B}/assets/roll.mp3`,
  startBetting: `${B}/assets/start-betting.mp3`,
  stopBetting: `${B}/assets/stop-betting.mp3`,
} as const

export const BOOT_PRELOAD: string[] = [
  IMG.tableFrame,
  IMG.dealerIdle,
  IMG.timer,
  IMG.cup,
  IMG.placeBets,
  IMG.stopBetting,
  IMG.btnBack,
  ...SYMBOL_ORDER.map(symbolWatermark),
  ...Object.values(CHIP_IMG_SM),
  ...SYMBOL_ORDER.map((s) => diceFace(s)),
]

export const PRELOAD: string[] = [
  ...BOOT_PRELOAD,
  ...Object.values(CHIP_IMG),
  ...Array.from({ length: 7 }, (_, i) => historyCount(i)),
  ...Array.from({ length: 6 }, (_, i) => avatarImg(i)),
]
