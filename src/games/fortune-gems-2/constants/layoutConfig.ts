import { DESIGN_H, DESIGN_W } from './gameConfig'

export { DESIGN_H, DESIGN_W }

/** Absolute packing for 850×480 landscape — unified stone cabinet layout */
export const BAND = {
  headerY: 0,
  headerH: 28,
  machineY: 18,
  machineH: 392,
  controlsY: 412,
  controlsH: 68,
}

/** Wheel tucked ~22% behind left cabinet pillar */
export const WHEEL = {
  x: -48,
  y: 48,
  size: 280,
}

export const CABINET = {
  x: 168,
  y: 6,
  w: 660,
  h: 378,
}

export const REELS = {
  x: 79,
  y: 51,
  w: 413,
  h: 302,
  cols: 3,
  rows: 3,
  gap: 4,
}

/** Special bay nested inside cabinet (4th column) */
export const SPECIAL = {
  x: 500,
  y: 45,
  w: 111,
  h: 308,
}

export const SPIN_BTN = {
  x: 740,
  y: 390,
  size: 96,
}
