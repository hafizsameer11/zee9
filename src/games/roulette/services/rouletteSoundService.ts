/**
 * Roulette sound mapping — uses local /sfx files via the shared SoundManager.
 * Missing files fail soft; gameplay continues when muted or unloaded.
 */
import type { SfxId } from '../../../lib/sound'
import { sound } from '../../../lib/sound'

export const ROULETTE_SFX = {
  buttonPress: 'softClick',
  chipPlace: 'chip',
  betRemoved: 'softClick',
  bettingClosing: 'countdown',
  betsClosed: 'close',
  wheelSpinning: 'spin',
  ballRolling: 'whoosh',
  ballBounce: 'pop',
  resultReveal: 'reveal',
  winPayout: 'win',
  lose: 'lose',
  error: 'error',
} as const satisfies Record<string, SfxId>

export type RouletteSfxKey = keyof typeof ROULETTE_SFX

export function playRouletteSfx(key: RouletteSfxKey, volume = 1) {
  try {
    const id = ROULETTE_SFX[key]
    if (!id) return
    sound.play(id, { volume })
  } catch {
    /* missing or muted — ignore */
  }
}

export async function preloadRouletteSfx() {
  try {
    const ids = [...new Set(Object.values(ROULETTE_SFX))]
    await sound.preload(ids)
  } catch {
    /* ignore */
  }
}
