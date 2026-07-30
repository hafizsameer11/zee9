/** Shared animation helpers — transforms / easing only. */

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

export function bezier2(
  t: number,
  from: { x: number; y: number },
  mid: { x: number; y: number },
  to: { x: number; y: number },
) {
  const omt = 1 - t
  return {
    x: omt * omt * from.x + 2 * omt * t * mid.x + t * t * to.x,
    y: omt * omt * from.y + 2 * omt * t * mid.y + t * t * to.y,
  }
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}
