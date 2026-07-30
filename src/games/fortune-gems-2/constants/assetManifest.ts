import { ASSET } from './gameConfig'
import { MULT_SRC, SYMBOL_META, WHEEL_TOKEN_SRC } from './symbolConfig'
import { preloadImages } from '../../../lib/preloadImages'

export const CRITICAL_ASSETS = [
  ASSET.bgPlay,
  ASSET.bgLoading,
  ASSET.logo,
  ASSET.cabinet,
  ASSET.specialPanel,
  ASSET.controlBar,
  ASSET.wheelBridge,
  ASSET.wheel,
  ASSET.pointer,
  ASSET.spin,
  ASSET.banner,
  ASSET.multSelect,
  ASSET.barTrack,
  ASSET.barFill,
  ASSET.continue,
  ASSET.feature1,
  ASSET.feature2,
  ASSET.feature3,
  ASSET.feature4,
  ...Object.values(SYMBOL_META).map((s) => s.src),
  ...Object.values(MULT_SRC),
  WHEEL_TOKEN_SRC.green,
  WHEEL_TOKEN_SRC.red,
]

export const SECONDARY_ASSETS = [
  ASSET.leavesL,
  ASSET.leavesR,
  ASSET.turbo,
  ASSET.turboOn,
  ASSET.auto,
  ASSET.autoOn,
  ASSET.plus,
  ASSET.minus,
  ASSET.sound,
  ASSET.soundOff,
  ASSET.info,
  ASSET.settings,
  ASSET.spark,
  ASSET.coin,
  ASSET.flash,
  ASSET.goldTrail,
  ASSET.winBanner,
  ASSET.bonusBanner,
  ASSET.chiliOn,
  ASSET.chiliOff,
]

let preloadPromise: Promise<void> | null = null

export async function preloadFortuneGems2Assets(
  onProgress?: (pct: number) => void,
): Promise<void> {
  if (preloadPromise) {
    await preloadPromise
    onProgress?.(100)
    return
  }
  preloadPromise = (async () => {
    const critical = [...new Set(CRITICAL_ASSETS)]
    await preloadImages(critical, {
      concurrency: 8,
      onProgress: (loaded, total) => {
        onProgress?.(Math.min(92, Math.round((loaded / Math.max(1, total)) * 92)))
      },
    })
    void preloadImages(SECONDARY_ASSETS, { concurrency: 6 })
    onProgress?.(100)
  })()
  await preloadPromise
}
