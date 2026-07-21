/** Crash flight curve mapped to real time × multiplier axes (matches labeled graph). */

import { CRASH_GROWTH_RATE, multiplierAtElapsedSmooth } from './crash'

export type Point = { x: number; y: number }

export const CRASH_VIEW_W = 800
export const CRASH_VIEW_H = 460

const PAD = { l: 48, r: 28, t: 28, b: 36 }

export type AxisCrashCurve = {
  stroke: string
  fill: string
  tip: Point
  tipPercent: { left: number; top: number }
  angleDeg: number
  tMax: number
  mMax: number
  yLabels: number[]
  xLabels: number[]
}

/** Build SVG path from elapsed seconds + live multiplier, aligned to axes. */
export function buildAxisCrashCurve(
  elapsedSec: number,
  mult: number,
  axisRef?: { t: number; m: number },
): AxisCrashCurve {
  const elapsed = Math.max(0, elapsedSec)
  const liveMult = Math.max(1, mult)

  const wantT = Math.max(10, elapsed * 1.15)
  const wantM = Math.max(2, liveMult * 1.25)
  const tMax = axisRef ? Math.max(axisRef.t, wantT) : wantT
  const mMax = axisRef ? Math.max(axisRef.m, wantM) : wantM
  if (axisRef) {
    axisRef.t = tMax
    axisRef.m = mMax
  }

  const gw = CRASH_VIEW_W - PAD.l - PAD.r
  const gh = CRASH_VIEW_H - PAD.t - PAD.b
  const bottomY = CRASH_VIEW_H - PAD.b
  const leftX = PAD.l

  const toXY = (t: number, m: number): Point => ({
    x: leftX + (Math.min(t, tMax) / tMax) * gw,
    y: bottomY - ((Math.min(m, mMax) - 1) / (mMax - 1)) * gh,
  })

  const steps = Math.max(24, Math.min(160, Math.ceil(elapsed * 35) + 1))
  const pts: Point[] = [toXY(0, 1)]
  for (let i = 1; i <= steps; i++) {
    const t = (elapsed * i) / steps
    const m = Math.max(1, multiplierAtElapsedSmooth(t * 1000, CRASH_GROWTH_RATE))
    pts.push(toXY(t, Math.min(m, liveMult + 0.0001)))
  }
  // Exact tip
  const tip = toXY(elapsed, liveMult)
  pts[pts.length - 1] = tip

  let stroke = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) stroke += ` L ${pts[i].x} ${pts[i].y}`
  const fill = `${stroke} L ${tip.x} ${bottomY} L ${pts[0].x} ${bottomY} Z`

  const prev = pts[Math.max(0, pts.length - 2)]!
  const angleDeg = (Math.atan2(tip.y - prev.y, tip.x - prev.x) * 180) / Math.PI

  const yLabels: number[] = []
  for (let i = 4; i >= 1; i--) yLabels.push(1 + ((mMax - 1) * i) / 4)
  const xLabels: number[] = []
  for (let i = 1; i <= 5; i++) xLabels.push((tMax * i) / 5)

  return {
    stroke,
    fill,
    tip,
    tipPercent: {
      left: (tip.x / CRASH_VIEW_W) * 100,
      top: (tip.y / CRASH_VIEW_H) * 100,
    },
    angleDeg,
    tMax,
    mMax,
    yLabels,
    xLabels,
  }
}

/** @deprecated kept for any legacy callers */
export function multiplierToCrashProgress(mult: number): number {
  return Math.min(1, Math.max(0, (mult - 1) / 7))
}

/** @deprecated */
export function buildCrashCurvePaths(progress: number) {
  const elapsed = progress * 12
  const mult = Math.exp(CRASH_GROWTH_RATE * elapsed * 1000)
  return buildAxisCrashCurve(elapsed, mult)
}
