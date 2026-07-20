/** Client-side crash helpers (Aviator-style). Must match backend growth rate. */

export const CRASH_GROWTH_RATE = 0.00006

export function generateCrashPoint(): number {
  const r = Math.random()
  if (r < 0.04) return 1.0
  const point = 0.99 / (1 - r)
  return Math.min(Math.max(1, Math.floor(point * 100) / 100), 100)
}

/** Discrete 2-decimal mult (matches server settlement). */
export function multiplierAtElapsed(elapsedMs: number, growthRate = CRASH_GROWTH_RATE): number {
  const m = Math.exp(growthRate * Math.max(0, elapsedMs))
  return Math.floor(m * 100) / 100
}

/** Continuous mult for smooth plane / graph animation. */
export function multiplierAtElapsedSmooth(elapsedMs: number, growthRate = CRASH_GROWTH_RATE): number {
  return Math.exp(growthRate * Math.max(0, elapsedMs))
}

export type CrashSkin = 'aviator' | 'double-crash' | 'crash'

export const CRASH_SKINS: Record<string, CrashSkin> = {
  aviator: 'aviator',
  'double-crash': 'double-crash',
  crash: 'crash',
}

export function getCrashSkin(gameId: string): CrashSkin {
  return CRASH_SKINS[gameId] ?? 'crash'
}
