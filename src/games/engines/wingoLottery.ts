/** Client-side WinGo Lottery helpers (landscape multiplayer table UI). */

export type WlColor = 'green' | 'violet' | 'red'
export type WlBetKey = `color:${WlColor}` | `num:${number}`
export type ChipDenom = 10 | 50 | 100 | 500 | 1000 | 2000 | 5000 | 10000

export const CHIP_DENOMS: ChipDenom[] = [10, 50, 100, 500, 1000, 2000, 5000, 10000]

export const COLOR_MULT: Record<WlColor, number> = {
  green: 2.4,
  violet: 4.8,
  red: 2.4,
}

export const NUMBER_MULT = 9.5

export type RoundPhase =
  | 'BETTING_OPEN'
  | 'BETTING_CLOSING'
  | 'STOP_BETTING'
  | 'MACHINE_ENTERING'
  | 'BALLS_MIXING'
  | 'BALL_SELECTED'
  | 'RESULT_REVEAL'
  | 'RESULT_TO_HISTORY'
  | 'SETTLEMENT'
  | 'START_BETTING'
  | 'ROUND_RESET'
  | 'WIN_CELEBRATION' // kept for win banner during settlement/start
  | 'WINNING_BALL_EXIT' // alias compatibility during transition

const CT = '/games/casino-table'

export type PlacedChip = {
  id: string
  denom: ChipDenom
  betKey: WlBetKey
  x: number
  y: number
  rot: number
  owner: 'me' | 'bot'
}

export type SidePlayer = {
  id: string
  name: string
  balance: number
  avatar: number
  badge?: 'winner' | 'lucky'
}

export function numberColor(n: number): WlColor {
  if (n === 0 || n === 5) return 'violet'
  return n % 2 === 1 ? 'green' : 'red'
}

export function ballSrc(n: number, size: 'history' | 'cell' | 'machine' | 'reveal' = 'cell'): string {
  return `${CT}/balls/ball-${n}-${size}.png`
}

export function chipTag(d: ChipDenom): string {
  if (d >= 10000) return '10k'
  if (d >= 5000) return '5k'
  if (d >= 2000) return '2k'
  if (d >= 1000) return '1k'
  return String(d)
}

export function chipSrc(d: ChipDenom, variant: 'large' | 'selector' | 'small' = 'large'): string {
  const tag = chipTag(d)
  if (variant === 'selector') return `${CT}/chips/chip-${tag}-selector.png`
  if (variant === 'small') return `${CT}/chips/chip-${tag}-small-a.png`
  return `${CT}/chips/chip-${tag}-large.png`
}

export function chipBoardSrc(d: ChipDenom, variant: 'a' | 'b' | 'c' | 'd' = 'a'): string {
  return `${CT}/chips/chip-${chipTag(d)}-small-${variant}.png`
}

export const CASINO_ASSETS = {
  table: `${CT}/background/table-base.webp`,
  tableHighlight: `${CT}/background/table-highlight.png`,
  tableVignette: `${CT}/background/table-vignette.png`,
  tableTexture: `${CT}/background/table-texture.webp`,
  corner: `${CT}/background/lower-corner-pattern.webp`,
  back: `${CT}/navigation/btn-back.png`,
  play: `${CT}/navigation/badge-play.png`,
  add: `${CT}/navigation/btn-add.png`,
  menu: `${CT}/navigation/btn-menu.png`,
  history: `${CT}/navigation/btn-history.png`,
  machineIcon: `${CT}/navigation/icon-machine.png`,
  newBadge: `${CT}/badges/badge-new.png`,
  winner: `${CT}/badges/badge-winner.png`,
  lucky: `${CT}/badges/badge-lucky.png`,
  victory: `${CT}/badges/badge-victory.png`,
  stop: `${CT}/banners/banner-stop.png`,
  start: `${CT}/banners/banner-start.png`,
  win: `${CT}/banners/banner-win.png`,
  rebet: `${CT}/controls/btn-rebet-normal.png`,
  rebetPressed: `${CT}/controls/btn-rebet-pressed.png`,
  rebetDisabled: `${CT}/controls/btn-rebet-disabled.png`,
  arrowLeft: `${CT}/controls/arrow-left.png`,
  arrowRight: `${CT}/controls/arrow-right.png`,
  group: `${CT}/controls/btn-group.png`,
  plus: `${CT}/controls/btn-plus.png`,
  chipHalo: `${CT}/controls/chip-halo.png`,
  footerConsole: `${CT}/controls/footer-console.png`,
  reference: `${CT}/reference/s9-reference.png`,
  panelGreen: `${CT}/panels/panel-green.png`,
  panelViolet: `${CT}/panels/panel-violet.png`,
  panelRed: `${CT}/panels/panel-red.png`,
  cell: `${CT}/panels/cell-small.png`,
  glowCyan: `${CT}/panels/glow-cyan.png`,
  glowGold: `${CT}/panels/glow-gold.png`,
  frameNormal: `${CT}/players/frame-normal.png`,
  frameWinner: `${CT}/players/frame-winner.png`,
  frameLucky: `${CT}/players/frame-lucky.png`,
  nameplate: `${CT}/players/nameplate.png`,
  machineBack: `${CT}/machine/machine-back.png`,
  machineChamber: `${CT}/machine/machine-chamber.png`,
  machineGlass: `${CT}/machine/machine-glass.png`,
  machineFront: `${CT}/machine/machine-front.png`,
  machineBase: `${CT}/machine/machine-base.png`,
  machineHighlight: `${CT}/machine/machine-highlight.png`,
  resultChannel: `${CT}/machine/machine-result-channel.png`,
  resultHolder: `${CT}/machine/machine-result-holder.png`,
  machineMini: `${CT}/machine/machine-mini.png`,
  machineFull: `${CT}/machine/machine-full.png`,
  machineTime: `${CT}/machine/machine-time-plate.png`,
  glowGoldFx: `${CT}/effects/glow-gold.png`,
  glowCyanFx: `${CT}/effects/glow-cyan.png`,
  glowReveal: `${CT}/effects/glow-reveal.png`,
  sparkle: `${CT}/effects/sparkle.png`,
  burst: `${CT}/effects/result-burst.png`,
  landingRing: `${CT}/effects/chip-landing-ring.png`,
  avatar: (n: number) => `${CT}/players/player-${String(((n - 1) % 6) + 1).padStart(2, '0')}.png`,
} as const

/** Critical URLs that must be warm before the table is shown. */
export function getCasinoPreloadUrls(): string[] {
  const urls = new Set<string>()
  const A = CASINO_ASSETS
  for (const v of Object.values(A)) {
    if (typeof v === 'string' && !v.includes('/reference/')) urls.add(v)
  }
  for (let i = 1; i <= 6; i++) urls.add(A.avatar(i))
  for (const d of CHIP_DENOMS) {
    urls.add(chipSrc(d, 'selector'))
    urls.add(chipSrc(d, 'large'))
    for (const v of ['a', 'b', 'c', 'd'] as const) urls.add(chipBoardSrc(d, v))
  }
  for (let n = 0; n < 10; n++) {
    urls.add(ballSrc(n, 'history'))
    urls.add(ballSrc(n, 'cell'))
    urls.add(ballSrc(n, 'machine'))
    urls.add(ballSrc(n, 'reveal'))
  }
  return [...urls]
}

/** Preload images; resolves when done (or after timeout). */
export function preloadCasinoAssets(
  onProgress?: (loaded: number, total: number) => void,
  timeoutMs = 12000,
): Promise<{ loaded: number; total: number }> {
  const urls = getCasinoPreloadUrls()
  const total = urls.length
  let loaded = 0
  const bump = () => {
    loaded += 1
    onProgress?.(loaded, total)
  }

  const jobs = urls.map(
    (src) =>
      new Promise<void>((resolve) => {
        const img = new Image()
        img.decoding = 'async'
        img.onload = () => {
          bump()
          // decode() helps avoid jank when first painted
          if (img.decode) {
            void img.decode().finally(() => resolve())
          } else resolve()
        }
        img.onerror = () => {
          bump()
          resolve()
        }
        img.src = src
      }),
  )

  return Promise.race([
    Promise.all(jobs).then(() => ({ loaded, total })),
    new Promise<{ loaded: number; total: number }>((resolve) => {
      window.setTimeout(() => resolve({ loaded, total }), timeoutMs)
    }),
  ])
}

export function chipLabel(d: ChipDenom): string {
  return d >= 1000 ? '1K' : String(d)
}

/** Display payout for UI (matches table labels). */
export function payoutFor(betKey: WlBetKey, result: number, stake: number): number {
  if (betKey.startsWith('num:')) {
    const n = Number(betKey.slice(4))
    return n === result ? Math.round(stake * NUMBER_MULT) : 0
  }
  const color = betKey.slice(6) as WlColor
  const rc = numberColor(result)
  if (color === 'violet') return rc === 'violet' ? Math.round(stake * COLOR_MULT.violet) : 0
  // 0 pays half on red, 5 pays half on green in classic rules — keep premium table odds simple:
  if (color === 'green') {
    if (result === 5) return Math.round(stake * 1.5)
    return rc === 'green' ? Math.round(stake * COLOR_MULT.green) : 0
  }
  if (color === 'red') {
    if (result === 0) return Math.round(stake * 1.5)
    return rc === 'red' ? Math.round(stake * COLOR_MULT.red) : 0
  }
  return 0
}

export function sumBets(chips: PlacedChip[], key: WlBetKey): number {
  return chips.filter((c) => c.betKey === key).reduce((s, c) => s + c.denom, 0)
}

export function randomResult(): number {
  return Math.floor(Math.random() * 10)
}

export const DEMO_LEFT: SidePlayer[] = [
  { id: 'L1', name: 'P48201', balance: 4280, avatar: 1, badge: 'winner' },
  { id: 'L2', name: 'P91044', balance: 910, avatar: 2 },
  { id: 'L3', name: 'P15502', balance: 1540, avatar: 6 },
]

export const DEMO_RIGHT: SidePlayer[] = [
  { id: 'R1', name: 'P27337', balance: 15620, avatar: 3, badge: 'lucky' },
  { id: 'R2', name: 'P83401', balance: 2340, avatar: 4 },
  { id: 'R3', name: 'P67019', balance: 670, avatar: 5 },
]

export const BET_SECONDS = 12
