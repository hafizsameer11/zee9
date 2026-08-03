import { BOARD, TRACK, TRACK_COLS, TRACK_ROWS, type AnimalId } from '../constants/gameConfig'

export type TrackSlot = { index: number; animal: AnimalId; x: number; y: number; w: number; h: number }

export function buildTrack(): TrackSlot[] {
  const { tileW: w, tileH: h } = BOARD
  const lastCol = TRACK_COLS - 1
  const lastRow = TRACK_ROWS - 1
  const cells: Array<[number, number]> = []
  for (let c = 0; c < TRACK_COLS; c++) cells.push([c, 0])
  for (let r = 1; r < lastRow; r++) cells.push([lastCol, r])
  for (let c = lastCol; c >= 0; c--) cells.push([c, lastRow])
  for (let r = lastRow - 1; r >= 1; r--) cells.push([0, r])

  return cells.map(([c, r], index) => ({
    index,
    animal: TRACK[index]!,
    x: c * w,
    y: r * h,
    w,
    h,
  }))
}

export const TRACK_SLOTS = buildTrack()

export function drawWinningSlot(): number {
  return Math.floor(Math.random() * TRACK.length)
}

export function makeEasing(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx

  return (x: number) => {
    let t = x
    for (let i = 0; i < 6; i++) {
      const dx = sampleX(t) - x
      if (Math.abs(dx) < 1e-5) break
      const d = slopeX(t)
      if (Math.abs(d) < 1e-6) break
      t -= dx / d
    }
    t = Math.min(1, Math.max(0, t))
    return ((ay * t + by) * t + cy) * t
  }
}

export const SPIN_EASE = makeEasing(0.08, 0, 0.18, 1)
