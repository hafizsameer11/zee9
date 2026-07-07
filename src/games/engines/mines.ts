export const GRID_SIZE = 25

export type MinesRound = {
  mineCount: number
  mines: Set<number>
  revealed: Set<number>
  bet: number
  active: boolean
}

export function createMinesRound(mineCount: number, bet: number): MinesRound {
  const mines = new Set<number>()
  while (mines.size < mineCount) {
    mines.add(Math.floor(Math.random() * GRID_SIZE))
  }
  return { mineCount, mines, revealed: new Set(), bet, active: true }
}

/** Stake-style mines multiplier approximation */
export function minesMultiplier(revealed: number, mineCount: number, gridSize = GRID_SIZE): number {
  if (revealed === 0) return 1
  let mult = 1
  const safe = gridSize - mineCount
  for (let i = 0; i < revealed; i++) {
    mult *= (gridSize - i) / (safe - i)
  }
  return Math.floor(mult * 0.97 * 100) / 100
}

export function revealTile(round: MinesRound, index: number): { hit: boolean; round: MinesRound } {
  if (!round.active || round.revealed.has(index)) {
    return { hit: false, round }
  }
  const revealed = new Set(round.revealed)
  revealed.add(index)
  const hit = round.mines.has(index)
  return {
    hit,
    round: { ...round, revealed, active: !hit },
  }
}
