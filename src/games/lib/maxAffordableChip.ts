import { useEffect } from 'react'

/** Largest chip denomination the player can afford (<= balance). */
export function maxAffordableChip<T extends number>(
  balance: number,
  chipValues: readonly T[],
): T {
  if (!chipValues.length) throw new Error('chipValues required')
  const floor = chipValues[0]!
  const affordable = Math.max(0, balance)
  for (let i = chipValues.length - 1; i >= 0; i--) {
    const value = chipValues[i]!
    if (affordable >= value) return value
  }
  return floor
}

/**
 * When balance changes, select the largest chip the player can still afford.
 * Manual chip picks stay until the wallet balance updates again.
 */
export function useAutoAffordableChip<T extends number>(
  balance: number,
  chipValues: readonly T[],
  setSelected: (value: T) => void,
) {
  useEffect(() => {
    setSelected(maxAffordableChip(balance, chipValues))
  }, [balance, chipValues, setSelected])
}
