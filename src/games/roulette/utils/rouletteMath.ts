import { EUROPEAN_WHEEL_ORDER, POCKET_ANGLE, pocketCenterAngle } from '../constants/rouletteConfig'

/** Normalize angle into [0, 360). */
export function normalizeAngle(deg: number): number {
  let a = deg % 360
  if (a < 0) a += 360
  return a
}

/**
 * Absolute angle (degrees, clockwise from top) of a pocket center
 * given current rotor rotation (clockwise positive).
 */
export function pocketWorldAngle(number: number, rotorDeg: number): number {
  return normalizeAngle(pocketCenterAngle(number) + rotorDeg)
}

/**
 * Ball orbit angle (clockwise from top) such that the ball sits in `number`
 * when the rotor is at `rotorDeg`. Pointer is at top (0°).
 */
export function ballAngleForResult(number: number, rotorDeg: number): number {
  return pocketWorldAngle(number, rotorDeg)
}

/**
 * Choose final rotor / ball angles for a dramatic multi-rotation spin
 * that lands the ball in `winningNumber` under the top pointer.
 *
 * Convention: pointer fixed at top. Winning pocket must end under pointer,
 * so final rotor rotates until pocket center is at 0° (top):
 *   rotorFinal = -pocketCenterAngle(win)  (mod 360)
 * Ball ends at top as well (in that pocket).
 */
export function computeSpinLanding(winningNumber: number, opts?: {
  wheelTurns?: number
  ballTurns?: number
}): { rotorFinal: number; ballFinal: number; wheelTurns: number; ballTurns: number } {
  const wheelTurns = opts?.wheelTurns ?? 4 + Math.floor(Math.random() * 2)
  const ballTurns = opts?.ballTurns ?? 6 + Math.floor(Math.random() * 2)
  const pocket = pocketCenterAngle(winningNumber)
  // Rotor spins clockwise; final position puts winning pocket at top.
  const rotorFinal = normalizeAngle(-pocket) + wheelTurns * 360
  // Ball spins counter-clockwise visually → negative direction in our CSS rotate.
  // End at top (0°) after many reverse turns.
  const ballFinal = -(ballTurns * 360)
  return { rotorFinal, ballFinal, wheelTurns, ballTurns }
}

export function numberAtPointer(rotorDeg: number): number {
  const local = normalizeAngle(-rotorDeg)
  const idx = Math.floor(local / POCKET_ANGLE) % EUROPEAN_WHEEL_ORDER.length
  return EUROPEAN_WHEEL_ORDER[idx]!
}

/** Ease-out cubic for deceleration. */
export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return 1 - (1 - x) ** 3
}

/** Ease-out quint — stronger late deceleration for ball. */
export function easeOutQuint(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return 1 - (1 - x) ** 5
}

/**
 * Ball bounce near the end: small angular wobble that settles to target.
 * t in [0,1] over full spin; bounce window near the end.
 */
export function ballBounceOffset(t: number): number {
  if (t < 0.82) return 0
  const local = (t - 0.82) / 0.18
  const damp = Math.exp(-3.2 * local)
  return Math.sin(local * Math.PI * 5) * 7 * damp
}
