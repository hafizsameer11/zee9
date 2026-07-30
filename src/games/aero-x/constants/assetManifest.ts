import { asset } from './gameConfig'

export const CHAR = {
  idle: asset('character/idle.webp'),
  prep: asset('character/prep.webp'),
  run: asset('character/run.webp'),
  fly: asset('character/fly.webp'),
  accel: asset('character/accel.webp'),
  away: asset('character/away.webp'),
} as const

export const ENV = {
  bg: asset('environment/bg.webp'),
  clouds: [
    asset('environment/cloud-soft-1.webp'),
    asset('environment/cloud-soft-2.webp'),
    asset('environment/cloud-soft-3.webp'),
    asset('environment/cloud-soft-4.webp'),
    asset('environment/cloud-soft-5.webp'),
    asset('environment/cloud-soft-6.webp'),
  ],
} as const

export const UI = {
  logo: asset('ui/logo-emblem.webp'),
  logoFallback: asset('ui/logo-plate.png'),
  logoPlate: asset('ui/logo-plate.png'),
  panel: asset('ui/panel-texture.webp'),
  headerMetal: asset('ui/header-metal.png'),
  wordmark: asset('loading/wordmark.png'),
  pills: {
    cyan: asset('ui/pill-cyan.png'),
    violet: asset('ui/pill-violet.png'),
    pink: asset('ui/pill-pink.png'),
    accent: asset('ui/pill-accent.png'),
  },
} as const

export const FX = {
  trail: asset('effects/trail-sheet.webp'),
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
  menu: asset('controls/icon-menu.png'),
  sound: asset('controls/icon-sound.png'),
  mute: asset('controls/icon-mute.png'),
  history: asset('controls/icon-history.png'),
  help: asset('controls/icon-help-subtle.png'),
  helpFallback: asset('controls/icon-help.png'),
  plus: asset('controls/plus.png'),
  minus: asset('controls/minus.png'),
  bet: asset('controls/btn-bet.png'),
  cashout: asset('controls/btn-cashout.png'),
  cancel: asset('controls/btn-cancel.png'),
} as const

/** First-screen panel + flight art — must be warm before the table paints. */
export const BOOT_ASSETS = [
  CHAR.idle,
  CHAR.prep,
  CHAR.run,
  CHAR.fly,
  CHAR.accel,
  CHAR.away,
  ENV.bg,
  ...ENV.clouds,
  UI.logo,
  UI.logoFallback,
  UI.panel,
  UI.headerMetal,
  UI.wordmark,
  UI.pills.cyan,
  UI.pills.violet,
  UI.pills.pink,
  UI.pills.accent,
  ...FX.particles,
  ...FX.smoke,
  CTRL.menu,
  CTRL.sound,
  CTRL.mute,
  CTRL.help,
  CTRL.plus,
  CTRL.minus,
  CTRL.bet,
  CTRL.cashout,
  CTRL.cancel,
] as const

export const ALL_ASSETS = [...BOOT_ASSETS, FX.trail, CTRL.history] as const
