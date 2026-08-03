import { ASSET, BASE } from './gameConfig'
import { SYMBOLS } from './symbolConfig'
import { preloadImages } from '../../../lib/preloadImages'

/** Fast path — scene + controls only (~100 KB). Game shows after this. */
export const BOOT_ASSETS: string[] = [
  ASSET.scene,
  ASSET.goldFrame,
  ASSET.spin,
  ASSET.minus,
  ASSET.plus,
  ASSET.auto,
  ASSET.turbo,
]

/** Unique symbol art (deduped — hunter/sheriff etc. share paths). */
export const SYMBOL_ASSETS: string[] = [...new Set(SYMBOLS.map((s) => s.src))]

export const SECONDARY_ASSETS: string[] = [
  ASSET.bigWin,
  ASSET.freeSpins,
  ASSET.featurePurchase,
  ASSET.coin,
  ASSET.spark,
  ASSET.smoke,
  ASSET.dust,
  ...Object.values(ASSET.icons),
]

let bootPromise: Promise<void> | null = null
let fullPromise: Promise<void> | null = null

/** Scene + controls — use for play/preview boot gate. */
export async function preloadBountyBoot(
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  if (bootPromise) {
    await bootPromise
    onProgress?.(BOOT_ASSETS.length, BOOT_ASSETS.length)
    return
  }
  bootPromise = preloadImages(BOOT_ASSETS, { concurrency: 6, onProgress })
  await bootPromise
}

/** Full preload — boot first, then symbols in background. */
export async function preloadBountyAssets(
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  if (fullPromise) {
    await fullPromise
    onProgress?.(BOOT_ASSETS.length + SYMBOL_ASSETS.length, BOOT_ASSETS.length + SYMBOL_ASSETS.length)
    return
  }
  fullPromise = (async () => {
    await preloadBountyBoot((loaded, total) => {
      onProgress?.(loaded, total + SYMBOL_ASSETS.length)
    })
    await preloadImages(SYMBOL_ASSETS, {
      concurrency: 10,
      onProgress: (loaded, total) => {
        onProgress?.(BOOT_ASSETS.length + loaded, BOOT_ASSETS.length + total)
      },
    })
    void preloadImages(SECONDARY_ASSETS, { concurrency: 6 })
  })()
  await fullPromise
}

export { BASE }
