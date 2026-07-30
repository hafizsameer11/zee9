export const DESIGN_W = 850
export const DESIGN_H = 480
export const BASE = '/games/fortune-gems-2'
/** Cache-bust after visual rebuild */
export const ASSET_V = 'v8'

export const BET_AMOUNTS = [1, 5, 10, 20, 30, 50, 100, 200, 300, 500, 800, 1000, 2000, 5000, 10000] as const

/** Display order from the reference game's 3×5 betting popup. */
export const BET_POPUP_AMOUNTS = [
  10000, 500, 30,
  5000, 300, 20,
  2000, 200, 10,
  1000, 100, 5,
  800, 50, 1,
] as const

const v = (path: string) => `${path}?${ASSET_V}`

export const ASSET = {
  bgPlay: v(`${BASE}/backgrounds/bg-play.png`),
  bgLoading: v(`${BASE}/backgrounds/bg-loading.png`),
  leavesL: v(`${BASE}/backgrounds/leaves-left.png`),
  leavesR: v(`${BASE}/backgrounds/leaves-right.png`),
  logo: v(`${BASE}/ui/logo.png`),
  continue: v(`${BASE}/ui/btn-continue.png`),
  winBanner: v(`${BASE}/ui/win-banner.png`),
  bonusBanner: v(`${BASE}/ui/bonus-banner.png`),
  chiliOn: v(`${BASE}/ui/chili-on.png`),
  chiliOff: v(`${BASE}/ui/chili-off.png`),
  cabinet: v(`${BASE}/frames/cabinet.png`),
  banner: v(`${BASE}/frames/banner.png`),
  multSelect: v(`${BASE}/frames/mult-select.png`),
  specialPanel: v(`${BASE}/frames/special-panel.png`),
  controlBar: v(`${BASE}/frames/control-bar.png`),
  wheelBridge: v(`${BASE}/frames/wheel-bridge.png`),
  wheel: v(`${BASE}/wheel/lucky-wheel.png`),
  pointer: v(`${BASE}/wheel/pointer.png`),
  spin: v(`${BASE}/controls/spin.png`),
  turbo: v(`${BASE}/controls/turbo.png`),
  turboOn: v(`${BASE}/controls/turbo-on.png`),
  auto: v(`${BASE}/controls/auto.png`),
  autoOn: v(`${BASE}/controls/auto-on.png`),
  plus: v(`${BASE}/controls/plus.png`),
  minus: v(`${BASE}/controls/minus.png`),
  sound: v(`${BASE}/controls/sound.png`),
  soundOff: v(`${BASE}/controls/sound-off.png`),
  info: v(`${BASE}/controls/info.png`),
  settings: v(`${BASE}/controls/settings.png`),
  barTrack: v(`${BASE}/loading/bar-track.png`),
  barFill: v(`${BASE}/loading/bar-fill.png`),
  feature1: v(`${BASE}/loading/feature-1.png`),
  feature2: v(`${BASE}/loading/feature-2.png`),
  feature3: v(`${BASE}/loading/feature-3.png`),
  feature4: v(`${BASE}/loading/feature-4.png`),
  spark: v(`${BASE}/particles/spark.png`),
  coin: v(`${BASE}/particles/coin.png`),
  flash: v(`${BASE}/effects/flash.png`),
  goldTrail: v(`${BASE}/effects/gold-trail.png`),
} as const

export const SPIN_MS = 1400
export const TURBO_SPIN_MS = 600
export const REEL_STAGGER_MS = 180
export const WHEEL_SPIN_MS = 3000
export const MULT_SPIN_MS = 900
export const WIN_HOLD_MS = 1200

export function formatMoney(n: number) {
  return n.toLocaleString('en-PK', { maximumFractionDigits: 2 })
}
