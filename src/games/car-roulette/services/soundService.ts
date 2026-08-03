/**
 * Car Roulette audio map — shared /sfx library through the global SoundManager.
 * Missing files fail soft so gameplay never blocks on audio.
 */
import type { SfxId } from '../../../lib/sound'
import { sound } from '../../../lib/sound'
import type { CarRouletteSfx } from '../hooks/useCarRoulette'

const MAP: Record<CarRouletteSfx, SfxId> = {
  chip: 'chipAdd',
  chipSelect: 'select',
  whoosh: 'whoosh',
  tick: 'tick',
  countdown: 'countdown',
  start: 'notify',
  stop: 'close',
  trackTick: 'tick',
  rev: 'spin',
  pass: 'whoosh',
  winner: 'success',
  shimmer: 'gem',
  coin: 'coin',
  lose: 'lose',
  error: 'error',
  click: 'softClick',
}

const GAIN: Partial<Record<CarRouletteSfx, number>> = {
  trackTick: 0.55,
  tick: 0.4,
  pass: 1.4,
  rev: 1.2,
  chip: 1.15,
}

export function playCrSfx(key: CarRouletteSfx, volume = 1) {
  try {
    sound.play(MAP[key], { volume: volume * (GAIN[key] ?? 1) })
  } catch {
    /* muted or unloaded */
  }
}

export async function preloadCrSfx() {
  try {
    await sound.preload([...new Set(Object.values(MAP))])
  } catch {
    /* ignore */
  }
}
