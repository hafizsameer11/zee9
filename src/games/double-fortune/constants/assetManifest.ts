import { ASSET } from './gameConfig'
import { SYMBOLS } from './symbolConfig'
import { preloadImages } from '../../../lib/preloadImages'

export const BOOT_ASSETS = [
  ASSET.loadingBgFallback,
  ASSET.studio,
  ASSET.logo,
  ASSET.getStarted,
  ASSET.stageFallback,
  ASSET.couple,
  ASSET.lantern,
  ASSET.reelFrame,
  ASSET.banner,
  ASSET.spin,
  ...SYMBOLS.map((s) => s.src),
]

export const SECONDARY_ASSETS = [
  ASSET.curtainL,
  ASSET.curtainR,
  ASSET.controlDeck,
  ASSET.infoStrip,
  ASSET.minus,
  ASSET.plus,
  ASSET.auto,
  ASSET.turbo,
  ASSET.settings,
  ASSET.sound,
  ASSET.x8,
  ASSET.bigWin,
  ASSET.megaWin,
  ASSET.freeSpins,
  ASSET.coin,
  ASSET.spark,
  ASSET.petal,
  ASSET.dust,
]

export async function preloadDoubleFortuneAssets(
  onProgress?: (pct: number) => void,
): Promise<void> {
  await preloadImages(BOOT_ASSETS, {
    onProgress: (done, total) => {
      onProgress?.(Math.round((done / Math.max(1, total)) * 92))
    },
  })
  void preloadImages(SECONDARY_ASSETS)
  onProgress?.(100)
}
