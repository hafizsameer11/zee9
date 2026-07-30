import { asset } from './gameConfig'

export const ROCKET = {
  idle: asset('rocket/idle.webp'),
  prep: asset('rocket/prep.webp'),
  ignition: asset('rocket/ignition.webp'),
  takeoff: asset('rocket/takeoff.webp'),
  fly: asset('rocket/fly.webp'),
  accel: asset('rocket/accel.webp'),
  away: asset('rocket/away.webp'),
} as const

export const ENV = {
  bg: asset('environment/bg.webp'),
  stars: [asset('environment/stars-1.webp'), asset('environment/stars-2.webp')],
  nebulae: [
    asset('environment/nebula-1.webp'),
    asset('environment/nebula-2.webp'),
    asset('environment/nebula-3.webp'),
  ],
  dust: asset('environment/dust.webp'),
  planets: {
    ringed: asset('environment/planet-ringed.webp'),
    volcanic: asset('environment/planet-volcanic.webp'),
    ice: asset('environment/planet-ice.webp'),
    moon: asset('environment/moon-grey.webp'),
  },
} as const

export const UI = {
  logo: asset('ui/logo.webp'),
  logoFallback: asset('ui/logo.png'),
  panel: asset('ui/panel-texture.webp'),
  headerMetal: asset('ui/header-metal.png'),
  wordmark: asset('loading/wordmark.png'),
  loadingBg: asset('loading/bg.png'),
  bankroll: asset('ui/bankroll-frame.png'),
  btnAdd: asset('ui/btn-add.png'),
  pills: {
    pink: asset('ui/pill-pink.png'),
    cyan: asset('ui/pill-cyan.png'),
    violet: asset('ui/pill-violet.png'),
    gold: asset('ui/pill-gold.png'),
  },
} as const

export const FX = {
  flame: asset('effects/flame-sheet.webp'),
  trail: asset('effects/trail-glow.webp'),
  particles: [
    asset('effects/particle-1.png'),
    asset('effects/particle-2.png'),
    asset('effects/particle-3.png'),
    asset('effects/particle-4.png'),
    asset('effects/particle-5.png'),
  ],
  smoke: [
    asset('effects/smoke-1.png'),
    asset('effects/smoke-2.png'),
    asset('effects/smoke-3.png'),
  ],
} as const

export const CTRL = {
  back: asset('controls/icon-back.png'),
  sound: asset('controls/icon-sound.png'),
  mute: asset('controls/icon-mute.png'),
  settings: asset('controls/icon-settings.png'),
  menu: asset('controls/icon-menu.png'),
  history: asset('controls/icon-history.png'),
  help: asset('controls/icon-help.png'),
  rules: asset('controls/icon-rules.png'),
  quest: asset('controls/icon-quest.png'),
  music: asset('controls/icon-music.png'),
  vibrate: asset('controls/icon-vibrate.png'),
  trend: asset('controls/icon-trend.png'),
  cart: asset('controls/icon-cart.png'),
  chip: asset('controls/icon-chip.png'),
  plus: asset('controls/plus.png'),
  minus: asset('controls/minus.png'),
  bet: asset('controls/btn-bet.png'),
  cashout: asset('controls/btn-cashout.png'),
  cancel: asset('controls/btn-cancel.png'),
} as const

export const AVATARS = Array.from({ length: 8 }, (_, i) =>
  asset(`avatars/av-${String(i + 1).padStart(2, '0')}.png`),
)

export const MODAL = {
  questChest: asset('modals/quest-chest.webp'),
  questFrame: asset('modals/quest-frame.png'),
  trendFrame: asset('modals/trend-frame.png'),
} as const

/** First-screen panel + rocket art — must be warm before the table paints. */
export const BOOT_ASSETS = [
  ROCKET.idle,
  ROCKET.prep,
  ROCKET.ignition,
  ROCKET.takeoff,
  ROCKET.fly,
  ROCKET.accel,
  ROCKET.away,
  ENV.bg,
  ENV.dust,
  ...ENV.stars,
  ...ENV.nebulae,
  ENV.planets.ringed,
  ENV.planets.volcanic,
  ENV.planets.ice,
  ENV.planets.moon,
  UI.logo,
  UI.logoFallback,
  UI.panel,
  UI.headerMetal,
  UI.wordmark,
  UI.loadingBg,
  UI.bankroll,
  UI.btnAdd,
  UI.pills.pink,
  UI.pills.cyan,
  UI.pills.violet,
  UI.pills.gold,
  FX.flame,
  ...FX.particles,
  ...FX.smoke,
  CTRL.back,
  CTRL.sound,
  CTRL.mute,
  CTRL.menu,
  CTRL.trend,
  CTRL.chip,
  CTRL.cart,
  CTRL.quest,
  CTRL.plus,
  CTRL.minus,
  CTRL.bet,
  CTRL.cashout,
  CTRL.cancel,
  ...AVATARS,
] as const

export const ALL_ASSETS = [
  ...BOOT_ASSETS,
  FX.trail,
  CTRL.quest,
  CTRL.settings,
  CTRL.rules,
  CTRL.music,
  CTRL.history,
  CTRL.help,
  MODAL.questChest,
  MODAL.questFrame,
  MODAL.trendFrame,
] as const
