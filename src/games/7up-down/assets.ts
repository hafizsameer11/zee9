import type { UpDownChoice } from '../engines/dice'
import { CHIP_VALUES, type ChipValue } from './constants'

const B = '/games/7up-down'
const V2 = `${B}/v2`

export const IMG = {
  roomBg: `${V2}/ui/room-bg.png`,
  table: `${B}/a3_a3184e79-5732-4e34-b655-69c2837b3b72.4311e.png`,
  logo: `${V2}/ui/logo.png`,
  btnAdd: `${V2}/ui/btn-add.png`,
  btnBack: `${B}/hud/back.png`,
  btnMenu: `${B}/hud/menu.png`,
  btnSocial: `${B}/hud/social.png`,
  cup: `${V2}/dice/cup.png`,
  badgeWinner: `${B}/icons/LUCKY_img_WINNER.png`,
  badgeLucky: `${B}/icons/LUCKY_img_lucky.png`,
} as const

export const ZONE_PLATE: Record<UpDownChoice, { idle: string; win: string }> = {
  down: { idle: `${V2}/zones/down.png`, win: `${V2}/zones/down-win.png` },
  seven: { idle: `${V2}/zones/seven.png`, win: `${V2}/zones/seven-win.png` },
  up: { idle: `${V2}/zones/up.png`, win: `${V2}/zones/up-win.png` },
}

export const CHIP_IMG: Record<ChipValue, string> = Object.fromEntries(
  CHIP_VALUES.map((v) => [v, `${V2}/chips/chip-${v}.png`]),
) as Record<ChipValue, string>

export const CHIP_IMG_SM: Record<ChipValue, string> = Object.fromEntries(
  CHIP_VALUES.map((v) => [v, `${V2}/chips/chip-${v}-sm.png`]),
) as Record<ChipValue, string>

export function diceFace(n: number, gold = false): string {
  const v = Math.min(6, Math.max(1, Math.round(n)))
  return `${V2}/dice/${gold ? 'gold' : 'white'}-${v}.png`
}

export function historyPill(sum: number): string {
  const v = Math.min(12, Math.max(2, Math.round(sum)))
  return `${V2}/history/${v}.png`
}

export const SND = {
  roll: `${B}/assets/audio__runDice.mp3`,
  startBetting: `${B}/assets/audio__hh_startbettingi.mp3`,
  stopBetting: `${B}/assets/audio__hh_stopbetting.mp3`,
} as const

/** Everything the loading screen should have in cache before the table shows. */
export const PRELOAD: string[] = [
  ...Object.values(IMG),
  ...Object.values(ZONE_PLATE).flatMap((z) => [z.idle, z.win]),
  ...Object.values(CHIP_IMG),
  ...Object.values(CHIP_IMG_SM),
  ...Array.from({ length: 6 }, (_, i) => diceFace(i + 1)),
  ...Array.from({ length: 6 }, (_, i) => diceFace(i + 1, true)),
  ...Array.from({ length: 11 }, (_, i) => historyPill(i + 2)),
]
