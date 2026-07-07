/** CRASH flight curve — from desinged-games/crash/Screen 4 */

export type Point = { x: number; y: number }

const VIEW_W = 800
const VIEW_H = 460

const SEG1 = {
  p0: { x: 0, y: 460 },
  p1: { x: 220, y: 450 },
  p2: { x: 380, y: 360 },
  p3: { x: 520, y: 220 },
}

const SEG2 = {
  p0: { x: 520, y: 220 },
  p1: { x: 600, y: 140 },
  p2: { x: 660, y: 90 },
  p3: { x: 720, y: 60 },
}

const JUNCTION_T = 0.55

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}

function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t
  const tt = t * t
  const uu = u * u
  const uuu = uu * u
  const ttt = tt * t
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  }
}

function partialCubicCmd(p0: Point, p1: Point, p2: Point, p3: Point, endT: number): string {
  if (endT <= 0) return ''
  if (endT >= 1) return `C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`

  const q0 = lerpPoint(p0, p1, endT)
  const q1 = lerpPoint(p1, p2, endT)
  const q2 = lerpPoint(p2, p3, endT)
  const r0 = lerpPoint(q0, q1, endT)
  const r1 = lerpPoint(q1, q2, endT)
  const s = lerpPoint(r0, r1, endT)
  return `C ${q0.x} ${q0.y} ${r0.x} ${r0.y} ${s.x} ${s.y}`
}

export function multiplierToCrashProgress(mult: number): number {
  return Math.min(1, Math.max(0, (mult - 1) / 7))
}

export function buildCrashCurvePaths(progress: number): {
  stroke: string
  fill: string
  tip: Point
  tipPercent: { left: number; top: number }
} {
  const t = Math.min(1, Math.max(0, progress))
  let stroke = `M ${SEG1.p0.x} ${SEG1.p0.y}`
  let tip: Point

  if (t <= JUNCTION_T) {
    const localT = t / JUNCTION_T
    stroke += ` ${partialCubicCmd(SEG1.p0, SEG1.p1, SEG1.p2, SEG1.p3, localT)}`
    tip = cubicPoint(SEG1.p0, SEG1.p1, SEG1.p2, SEG1.p3, localT)
  } else {
    stroke += ` C ${SEG1.p1.x} ${SEG1.p1.y} ${SEG1.p2.x} ${SEG1.p2.y} ${SEG1.p3.x} ${SEG1.p3.y}`
    const localT = (t - JUNCTION_T) / (1 - JUNCTION_T)
    stroke += ` ${partialCubicCmd(SEG2.p0, SEG2.p1, SEG2.p2, SEG2.p3, localT)}`
    tip = cubicPoint(SEG2.p0, SEG2.p1, SEG2.p2, SEG2.p3, localT)
  }

  const fill = `${stroke} L ${tip.x} ${VIEW_H} L ${SEG1.p0.x} ${VIEW_H} Z`

  return {
    stroke,
    fill,
    tip,
    tipPercent: {
      left: (tip.x / VIEW_W) * 100,
      top: (tip.y / VIEW_H) * 100,
    },
  }
}

export const CRASH_VIEW_W = VIEW_W
export const CRASH_VIEW_H = VIEW_H
