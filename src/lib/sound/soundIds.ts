export const SFX = {
  click: '/sfx/click.mp3',
  tap: '/sfx/tap.mp3',
  softClick: '/sfx/soft-click.mp3',
  select: '/sfx/select.mp3',
  pop: '/sfx/pop.mp3',
  whoosh: '/sfx/whoosh.mp3',
  open: '/sfx/open.mp3',
  close: '/sfx/close.mp3',
  flip: '/sfx/flip.mp3',
  tick: '/sfx/tick.mp3',
  countdown: '/sfx/countdown.mp3',
  notify: '/sfx/notify.mp3',
  bet: '/sfx/bet.mp3',
  chip: '/sfx/chip.mp3',
  reveal: '/sfx/reveal.mp3',
  gem: '/sfx/gem.mp3',
  boom: '/sfx/boom.mp3',
  crash: '/sfx/crash.mp3',
  lose: '/sfx/lose.mp3',
  error: '/sfx/error.mp3',
  coin: '/sfx/coin.mp3',
  win: '/sfx/win.mp3',
  success: '/sfx/success.mp3',
  cashout: '/sfx/cashout.mp3',
  spin: '/sfx/spin.mp3',
  bonus: '/sfx/bonus.mp3',
  levelUp: '/sfx/level-up.mp3',
} as const

export type SfxId = keyof typeof SFX

export const PREF_KEY = 'zee9-sound-prefs'

export type SoundPrefs = {
  music: boolean
  sfx: boolean
  vibrate: boolean
  volume: number
}

export const DEFAULT_PREFS: SoundPrefs = {
  music: true,
  sfx: true,
  vibrate: true,
  volume: 0.85,
}
