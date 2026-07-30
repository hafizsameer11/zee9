import {
  ASSET,
  CHICKEN_FRAMES,
  VEHICLE_KINDS,
  type ChickenFrame,
  type VehicleKind,
} from './gameConfig'

const CHICKEN_URLS = [
  ...CHICKEN_FRAMES.map((f: ChickenFrame) => ASSET.chicken(f)),
  ASSET.chicken('shadow'),
]

const VEHICLE_URLS = VEHICLE_KINDS.flatMap((k: VehicleKind) => [
  ASSET.vehicle(k, false),
  ASSET.vehicle(k, true),
])

const ROAD_URLS = [
  ASSET.road('asphalt'),
  ASSET.road('edge'),
  ASSET.road('lane-mark'),
  ASSET.road('pavement'),
]

const ENV_URLS = [
  ASSET.env('barrier'),
  ASSET.env('bush'),
  ASSET.env('bush-2'),
  ASSET.env('cone'),
  ASSET.env('destination'),
  ASSET.env('drain'),
  ASSET.env('flower'),
  ASSET.env('grass'),
  ASSET.env('lamp-post'),
  ASSET.env('road-sign'),
  ASSET.env('safe-zone'),
]

const MULTIPLIER_URLS = (
  ['locked', 'upcoming', 'current', 'completed', 'failed'] as const
).map((s) => ASSET.multiplier(s))

const CONTROL_URLS = [
  ASSET.control('play-btn'),
  ASSET.control('play-btn-disabled'),
  ASSET.control('cashout-btn'),
]

const EFFECT_URLS = [
  ASSET.effect('coin'),
  ASSET.effect('coin-particle'),
  ASSET.effect('dust'),
  ASSET.effect('feather'),
  ASSET.effect('impact-stars'),
  ASSET.effect('loss-badge'),
  ASSET.effect('win-badge'),
]

const ICON_URLS = [
  'balance',
  'bet',
  'cashout',
  'decrease-bet',
  'difficulty-easy',
  'difficulty-hard',
  'difficulty-hardcore',
  'difficulty-medium',
  'fullscreen',
  'history',
  'howto',
  'increase-bet',
  'info',
  'loss',
  'max-bet',
  'menu',
  'min-bet',
  'music',
  'next',
  'play',
  'prev',
  'progress',
  'settings',
  'sound',
  'sound-off',
  'vehicle-warning',
  'warning',
  'win',
].map((n) => ASSET.icon(n))

const LOADING_URLS = [
  ASSET.loading('logo'),
  ASSET.loading('chicken-run'),
  ASSET.loading('car-silhouette'),
  ASSET.loading('progress-bar'),
  ASSET.loading('road-sign'),
]

/** Critical first-paint set for loading screen. */
export const BOOT_ASSETS = [
  ...LOADING_URLS,
  ASSET.icon('sound'),
  ASSET.icon('music'),
  ASSET.icon('menu'),
  ASSET.icon('balance'),
  ASSET.control('play-btn'),
]

/** Scene + character assets required before READY. */
export const SCENE_ASSETS = [
  ...CHICKEN_URLS,
  ...VEHICLE_URLS,
  ...ROAD_URLS,
  ...ENV_URLS,
  ...MULTIPLIER_URLS,
  ...EFFECT_URLS,
]

/** Full UI chrome. */
export const UI_ASSETS = [...CONTROL_URLS, ...ICON_URLS, ...LOADING_URLS]

/** Everything the game may display. */
export const ALL_ASSETS = [...new Set([...BOOT_ASSETS, ...SCENE_ASSETS, ...UI_ASSETS])]

export const SOUND_FILES = [
  'bet-change',
  'button',
  'cashout',
  'chicken-idle',
  'chicken-jump',
  'chicken-land',
  'coin',
  'collision',
  'difficulty',
  'engine',
  'feather',
  'horn',
  'loss',
  'menu-close',
  'menu-open',
  'multiplier',
  'pass',
  'round-start',
  'step-success',
  'warning',
  'win',
] as const

export type SoundFileId = (typeof SOUND_FILES)[number]
