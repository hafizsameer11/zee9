/** Client-side crash point generation (Aviator-style). */

export function generateCrashPoint(): number {
  const r = Math.random()
  if (r < 0.04) return 1.0
  const point = 0.99 / (1 - r)
  return Math.min(Math.max(1, Math.floor(point * 100) / 100), 100)
}

export function multiplierAtElapsed(elapsedMs: number, growthRate = 0.00006): number {
  const m = Math.exp(growthRate * elapsedMs)
  return Math.floor(m * 100) / 100
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
