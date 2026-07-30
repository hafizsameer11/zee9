import { ASSET, BASE } from './gameConfig'
import { SYMBOLS } from './symbolConfig'
import { preloadImages } from '../../../lib/preloadImages'

export const CRITICAL_ASSETS: string[] = [
  ASSET.bg,
  ASSET.loadingHero,
  ASSET.logo,
  ASSET.multiplierBoard,
  ASSET.statusBoard,
  ASSET.reelFrame,
  ASSET.goldFrame,
  ASSET.featureBuy,
  ASSET.spin,
  ASSET.minus,
  ASSET.plus,
  ASSET.auto,
  ASSET.coin,
  ASSET.smoke,
  ASSET.dust,
  ASSET.foreground,
  ASSET.controlDeck,
  ...SYMBOLS.map((s) => s.src),
]

export const SECONDARY_ASSETS: string[] = [
  ASSET.bigWin,
  ASSET.freeSpins,
  ASSET.featurePurchase,
  ASSET.turbo,
  ASSET.spark,
  ...Object.values(ASSET.icons),
  ASSET.bgFallback,
  ASSET.loadingHeroFallback,
]

let preloadPromise: Promise<void> | null = null

export async function preloadBountyAssets(
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  if (preloadPromise) {
    await preloadPromise
    onProgress?.(CRITICAL_ASSETS.length, CRITICAL_ASSETS.length)
    return
  }
  preloadPromise = (async () => {
    await preloadImages(CRITICAL_ASSETS, {
      concurrency: 8,
      onProgress,
    })
    void preloadImages(SECONDARY_ASSETS, { concurrency: 6 })
  })()
  await preloadPromise
}

export { BASE }
