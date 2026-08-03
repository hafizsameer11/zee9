import type { SfxId } from '../../../lib/sound'
import { sound } from '../../../lib/sound'
import type { ZooRouletteSfx } from '../hooks/useZooRoulette'

const MAP: Record<ZooRouletteSfx, SfxId> = {
  chip: 'chipAdd',
  chipSelect: 'select',
  whoosh: 'whoosh',
  tick: 'tick',
  countdown: 'countdown',
  start: 'notify',
  stop: 'close',
  trackTick: 'tick',
  rev: 'spin',
  reveal: 'whoosh',
  winner: 'success',
  shimmer: 'gem',
  coin: 'coin',
  lose: 'lose',
  error: 'error',
  click: 'softClick',
}

const GAIN: Partial<Record<ZooRouletteSfx, number>> = {
  trackTick: 0.52,
  tick: 0.38,
  reveal: 1.3,
  rev: 1.15,
  chip: 1.1,
}

export function playZooSfx(key: ZooRouletteSfx, volume = 1) {
  try {
    sound.play(MAP[key], { volume: volume * (GAIN[key] ?? 1) })
  } catch {
    /* muted or unloaded */
  }
}

export async function preloadZooSfx() {
  try {
    await sound.preload([...new Set(Object.values(MAP))])
  } catch {
    /* ignore */
  }
}
