export type FishType = { id: string; emoji: string; multiplier: number; speed: number; size: number }

export const FISH_TYPES: FishType[] = [
  { id: 'small', emoji: '🐟', multiplier: 2, speed: 2.5, size: 28 },
  { id: 'medium', emoji: '🐠', multiplier: 5, speed: 2, size: 36 },
  { id: 'large', emoji: '🦈', multiplier: 10, speed: 1.5, size: 44 },
  { id: 'boss', emoji: '🐋', multiplier: 25, speed: 1, size: 52 },
]

export function randomFish(): FishType {
  const r = Math.random()
  if (r < 0.5) return FISH_TYPES[0]!
  if (r < 0.8) return FISH_TYPES[1]!
  if (r < 0.95) return FISH_TYPES[2]!
  return FISH_TYPES[3]!
}

export function catchSuccess(): boolean {
  return Math.random() < 0.55
}
