import { ASSET, BRANDS, CHIP_VALUES } from './gameConfig'

/** Everything the first painted frame needs. */
export const BOOT_ASSETS: string[] = [
  ASSET.bgLite,
  ASSET.bg,
  ASSET.chassis,
  ASSET.well,
  ASSET.tile('normal'),
  ASSET.tile('active'),
  ASSET.tile('winner'),
  ASSET.ui('tower'),
  ASSET.ui('panel'),
  ASSET.ui('btn-round'),
  ASSET.ui('avatar-frame'),
  ASSET.ui('timer-bezel'),
  ASSET.ui('ico-back'),
  ASSET.ui('ico-sound'),
  ASSET.ui('ico-settings'),
  ASSET.ui('ico-help'),
  ASSET.ui('ico-plus'),
  ASSET.ui('ico-rebet'),
  ASSET.ui('ico-tri'),
  ...BRANDS.map((b) => ASSET.emblem(b.id)),
  ...BRANDS.map((b) => ASSET.emblem(b.id, true)),
  ...CHIP_VALUES.map((v) => ASSET.chip(v)),
  ...CHIP_VALUES.map((v) => ASSET.chip(v, true)),
]

/** Warmed in the background once the table is interactive. */
export const GAMEPLAY_ASSETS: string[] = [
  ASSET.banner('start'),
  ASSET.banner('stop'),
  ASSET.ui('dialog'),
  ASSET.fx('shock'),
  ASSET.fx('rays'),
  ASSET.fx('speed'),
  ASSET.fx('sparks'),
  ...BRANDS.map((b) => ASSET.car(b.id)),
]
