/** Aviator flight curve — matches design SVG path in desinged-games/aviatar/Screen 2 */

export type Point = { x: number; y: number }

export const VIEW_W = 1000
export const VIEW_H = 720

const SEG1 = {
  p0: { x: 0, y: 720 },
  p1: { x: 250, y: 700 },
  p2: { x: 520, y: 540 },
  p3: { x: 720, y: 300 },
}

const SEG2 = {
  p0: { x: 720, y: 300 },
  p1: { x: 800, y: 205 },
  p2: { x: 850, y: 150 },
  p3: { x: 880, y: 120 },
}

const JUNCTION_T = 0.5

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}

/** Point on cubic Bézier at t ∈ [0, 1] */
export function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
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

/** SVG cubic segment from t=0 to t=endT (de Casteljau sub-curve) */
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

/** Map multiplier to curve progress 0–1 (full path ≈ 8x) */
export function multiplierToProgress(mult: number): number {
  return Math.min(1, Math.max(0, (mult - 1) / 7))
}

export function pointOnAviatorCurve(progress: number): Point {
  const t = Math.min(1, Math.max(0, progress))
  if (t <= JUNCTION_T) {
    return cubicPoint(SEG1.p0, SEG1.p1, SEG1.p2, SEG1.p3, t / JUNCTION_T)
  }
  return cubicPoint(SEG2.p0, SEG2.p1, SEG2.p2, SEG2.p3, (t - JUNCTION_T) / (1 - JUNCTION_T))
}

export function buildAviatorCurvePaths(progress: number): {
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

  const fill = `${stroke} L ${tip.x} ${VIEW_H} Z`

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

/** Sample points along the curve from 0 → progress (for canvas rendering) */
export function sampleAviatorCurve(progress: number, segments = 64): Point[] {
  const t = Math.min(1, Math.max(0, progress))
  if (t <= 0) return [pointOnAviatorCurve(0)]
  const count = Math.max(2, Math.ceil(segments * t))
  const pts: Point[] = []
  for (let i = 0; i <= count; i++) {
    pts.push(pointOnAviatorCurve((i / count) * t))
  }
  return pts
}

/** Tangent angle in degrees for plane rotation (canvas: 0=right, positive=clockwise) */
export function curveTangentAngle(progress: number): number {
  const eps = 0.008
  const t0 = Math.max(0, progress - eps)
  const t1 = Math.min(1, progress + eps)
  const a = pointOnAviatorCurve(t0)
  const b = pointOnAviatorCurve(t1)
  const dx = (b.x - a.x) / VIEW_W
  const dy = (b.y - a.y) / VIEW_H
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

/** Full static curve (design reference) */
export const FULL_CURVE_STROKE = `M 0 720 C 250 700 520 540 720 300 C 800 205 850 150 880 120`
export const FULL_CURVE_FILL = `${FULL_CURVE_STROKE} L 880 720 Z`
