/** Rocket flight curves — from desinged-games/double crash out Screen 2 */

export type Point = { x: number; y: number }

const ROCKET_A = {
  p0: { x: 20, y: 285 },
  p1: { x: 160, y: 260 },
  p2: { x: 240, y: 150 },
  p3: { x: 370, y: 40 },
}

const ROCKET_B = {
  p0: { x: 20, y: 285 },
  p1: { x: 140, y: 270 },
  p2: { x: 220, y: 120 },
  p3: { x: 375, y: 20 },
}

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

export function multiplierToRocketProgress(mult: number): number {
  return Math.min(1, Math.max(0, (mult - 1) / 7))
}

export function buildRocketCurve(rocket: 'a' | 'b', progress: number): { stroke: string; tip: Point } {
  const seg = rocket === 'a' ? ROCKET_A : ROCKET_B
  const t = Math.min(1, Math.max(0, progress))
  const stroke = `M ${seg.p0.x} ${seg.p0.y} ${partialCubicCmd(seg.p0, seg.p1, seg.p2, seg.p3, t)}`
  const tip = cubicPoint(seg.p0, seg.p1, seg.p2, seg.p3, t)
  return { stroke, tip }
}

export const FULL_CURVE_A = `M ${ROCKET_A.p0.x} ${ROCKET_A.p0.y} C ${ROCKET_A.p1.x} ${ROCKET_A.p1.y} ${ROCKET_A.p2.x} ${ROCKET_A.p2.y} ${ROCKET_A.p3.x} ${ROCKET_A.p3.y}`
export const FULL_CURVE_B = `M ${ROCKET_B.p0.x} ${ROCKET_B.p0.y} C ${ROCKET_B.p1.x} ${ROCKET_B.p1.y} ${ROCKET_B.p2.x} ${ROCKET_B.p2.y} ${ROCKET_B.p3.x} ${ROCKET_B.p3.y}`
