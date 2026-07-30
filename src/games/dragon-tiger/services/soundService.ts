/**
 * Dragon Tiger sound mapping — local /sfx via shared SoundManager.
 * Missing files fail soft; gameplay continues when muted or unloaded.
 */
import type { SfxId } from '../../../lib/sound'
import { sound } from '../../../lib/sound'

export const DT_SFX = {
  buttonPress: 'softClick',
  chipSelect: 'select',
  chipFlight: 'whoosh',
  chipLand: 'chip',
  chipAdd: 'chipAdd',
  countdown: 'countdown',
  stopBetting: 'close',
  cardDeal: 'whoosh',
  cardFlip: 'flip',
  dragonEnter: 'whoosh',
  dragonRoar: 'dragonRoar',
  tigerEnter: 'whoosh',
  tigerRoar: 'tigerRoar',
  tieEnergy: 'reveal',
  winHighlight: 'success',
  victory: 'win',
  lose: 'lose',
  coinPayout: 'coin',
  error: 'error',
  tick: 'tick',
} as const satisfies Record<string, SfxId>

export type DtSfxKey = keyof typeof DT_SFX

export function playDtSfx(key: DtSfxKey, volume = 1) {
  try {
    const id = DT_SFX[key]
    if (!id) return
    const boost =
      key === 'dragonRoar' || key === 'dragonEnter' || key === 'tigerRoar' || key === 'tigerEnter'
        ? 1.35
        : key === 'chipAdd'
          ? 1.25
          : 1
    sound.play(id, { volume: volume * boost })
  } catch {
    /* missing or muted */
  }
}

export async function preloadDtSfx() {
  try {
    const ids = [...new Set(Object.values(DT_SFX))]
    await sound.preload(ids)
  } catch {
    /* ignore */
  }
}
