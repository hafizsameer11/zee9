import {
  ASSET,
  BASE,
  COIN_FRAMES,
  MULT_ACTIVE,
  SYMBOL_IDS,
  symbolSrc,
} from './gameConfig'
import { preloadImages } from '../../../lib/preloadImages'

/** Critical path — loading screen + first paint of the table. */
export const BOOT_ASSETS: string[] = [
  ASSET.loadingBg,
  ASSET.studio,
  ASSET.felt,
  ASSET.wallpaper,
  ASSET.woodTop,
  ASSET.woodBottom,
  ASSET.board,
  ASSET.logo,
  ASSET.multiplierBar,
  ASSET.playBtn,
  ASSET.spin,
  ASSET.buyBonus,
  ...SYMBOL_IDS.map((id) => symbolSrc(id)),
  ...(['spade', 'heart', 'diamond', 'club', 'jack', 'queen', 'king', 'ace'] as const).map(
    (id) => symbolSrc(id, true),
  ),
]

export const SECONDARY_ASSETS: string[] = [
  ...MULT_ACTIVE,
  ASSET.superWin,
  ASSET.turbo,
  ASSET.auto,
  ASSET.settings,
  ASSET.plus,
  ASSET.minus,
  ASSET.menu,
  ASSET.sound,
  ASSET.info,
  ...COIN_FRAMES,
  `${BASE}/sfx/spin.mp3`,
  `${BASE}/sfx/win.mp3`,
  `${BASE}/sfx/burn.mp3`,
  `${BASE}/sfx/drop.mp3`,
  `${BASE}/sfx/superwin.mp3`,
  `${BASE}/sfx/coins.mp3`,
  `${BASE}/sfx/wild.mp3`,
  `${BASE}/sfx/scatter.mp3`,
]

export const CRITICAL_ASSETS = BOOT_ASSETS

let preloadPromise: Promise<void> | null = null

export async function preloadSuperAceAssets(
  onProgress?: (pct: number) => void,
): Promise<void> {
  if (preloadPromise) {
    await preloadPromise
    onProgress?.(100)
    return
  }
  preloadPromise = (async () => {
    const critical = [...new Set(BOOT_ASSETS)]
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
