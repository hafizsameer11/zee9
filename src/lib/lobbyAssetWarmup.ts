import { S9_ASSETS } from '../components/s9/S9AssetIcon'
import {
  getGameThumb,
  LOBBY_FEATURED_GAME_IDS,
  S9_GAMES,
} from '../data/s9Games'
import { DEVELOPED_GAME_IDS } from '../games/developedGames'
import { CRASH_ASSETS } from '../games/components/crashAssets'
import { PRELOAD as SEVEN_UP_ASSETS } from '../games/7up-down/assets'
import { BOOT_PRELOAD as JHANDI_BOOT } from '../games/jhandi-munda/assets'
import { preloadImages, runWhenIdle } from './preloadImages'
import { ZEE9_LOGO, ZEE9_LOGO_PNG } from '../components/Zee9LoadingScreen'

let started = false
let lobbyReadyPromise: Promise<void> | null = null

function thumbWithFallback(url: string): string[] {
  if (url.endsWith('.webp')) return [url, url.replace(/\.webp$/i, '.png')]
  if (url.endsWith('.png')) return [url.replace(/\.png$/i, '.webp'), url]
  return [url]
}

function featuredThumbUrls(): string[] {
  return LOBBY_FEATURED_GAME_IDS.flatMap((id) => {
    const g = S9_GAMES.find((x) => x.id === id)
    const primary = g ? getGameThumb(g) : `/games/${id}.webp`
    return thumbWithFallback(primary)
  })
}

function allDevelopedThumbUrls(): string[] {
  return [...DEVELOPED_GAME_IDS].flatMap((id) => {
    const g = S9_GAMES.find((x) => x.id === id)
    const primary = g ? getGameThumb(g) : `/games/${id}.webp`
    return thumbWithFallback(primary)
  })
}

/** Every mapped catalog thumb so category switches never pop empty tiles. */
function allCatalogThumbUrls(): string[] {
  return S9_GAMES.flatMap((g) => thumbWithFallback(getGameThumb(g)))
}

const MINES_ASSETS = [
  '/mines/cave-bg.png',
  '/mines/wood-planks.png',
  '/mines/wood-dark.png',
  '/mines/paper.png',
] as const

const AVIATOR_ASSETS = ['/games/aviator/plane.png'] as const

const WINGO_UI_ASSETS = [
  '/games/wingo/ui/table-felt.png',
  '/games/wingo/ui/btn-back.png',
  '/games/wingo/ui/btn-menu.png',
  '/games/wingo/ui/btn-add.png',
  '/games/wingo/ui/btn-rebet.png',
  '/games/wingo/ui/btn-plus.png',
  '/games/wingo/ui/btn-trend.png',
  '/games/wingo/ui/banner-start.png',
  '/games/wingo/ui/banner-stop.png',
  '/games/wingo/ui/banner-win.png',
  ...Array.from({ length: 10 }, (_, n) => `/games/wingo/balls/ball-${n}.png`),
  ...Array.from({ length: 10 }, (_, n) => `/games/wingo/balls/ball-${n}-sm.png`),
] as const

/**
 * Brand + icons + EVERY developed lobby thumb (webp+png).
 * Lobby UI must await this before painting the grid.
 */
export function warmLobbyCritical(
  onProgress?: (pct: number) => void,
): Promise<void> {
  if (lobbyReadyPromise) {
    void lobbyReadyPromise.then(() => onProgress?.(100))
    return lobbyReadyPromise
  }

  const urls = [
    ZEE9_LOGO,
    ZEE9_LOGO_PNG,
    ...Object.values(S9_ASSETS),
    ...featuredThumbUrls(),
    ...allDevelopedThumbUrls(),
    ...allCatalogThumbUrls(),
  ]

  lobbyReadyPromise = preloadImages(urls, {
    concurrency: 10,
    onProgress: (loaded, total) => {
      onProgress?.(Math.round((loaded / Math.max(1, total)) * 100))
    },
  })

  return lobbyReadyPromise
}

/** Awaitable gate used by S9Lobby. */
export function ensureLobbyAssetsReady(
  onProgress?: (pct: number) => void,
): Promise<void> {
  return warmLobbyCritical(onProgress)
}

async function warmGameBootAssets() {
  const jobs: Array<() => Promise<unknown>> = [
    () =>
      import('../games/engines/moneyComingAssets').then((m) =>
        m.preloadMoneyComingAssets(),
      ),
    () =>
      import('../games/fortune-gems-2/constants/assetManifest').then((m) =>
        m.preloadFortuneGems2Assets(),
      ),
    () =>
      import('../games/bounty-trail/constants/assetManifest').then((m) =>
        m.preloadBountyBoot(),
      ),
    () =>
      import('../games/aero-x/constants/assetManifest').then((m) =>
        preloadImages(m.BOOT_ASSETS, { concurrency: 4 }),
      ),
    () =>
      import('../games/double-crash/constants/assetManifest').then((m) =>
        preloadImages(m.BOOT_ASSETS, { concurrency: 4 }),
      ),
    () =>
      import('../games/chicken-road/constants/assetManifest').then((m) =>
        preloadImages(m.BOOT_ASSETS, { concurrency: 4 }),
      ),
    () =>
      import('../games/dragon-tiger/constants/assetManifest').then((m) =>
        preloadImages(m.BOOT_ASSETS, { concurrency: 4 }),
      ),
    () =>
      import('../games/roulette/constants/rouletteConfig').then((m) =>
        preloadImages(m.CRITICAL_ASSETS, { concurrency: 4 }),
      ),
    () => withProgress([...Object.values(CRASH_ASSETS)]),
    () => withProgress([...MINES_ASSETS]),
    () => withProgress([...AVIATOR_ASSETS]),
    () => withProgress([...SEVEN_UP_ASSETS]),
  ]

  for (const job of jobs) {
    try {
      await job()
    } catch {
      /* ignore */
    }
  }
}

export function startLobbyAssetWarmup() {
  if (started) return
  started = true
  void warmLobbyCritical()
  runWhenIdle(() => {
    void warmGameBootAssets()
  }, 1800)
}

type ProgressCb = (pct: number) => void

async function withProgress(
  urls: readonly string[],
  onProgress?: ProgressCb,
  concurrency = 8,
) {
  await preloadImages(urls, {
    concurrency,
    onProgress: (loaded, total) => {
      onProgress?.(Math.min(99, Math.round((loaded / Math.max(1, total)) * 100)))
    },
  })
  onProgress?.(100)
}

/** Warm a specific game immediately (play/preview). Reports 0–100 progress. */
export async function warmGameById(gameId: string, onProgress?: ProgressCb) {
  onProgress?.(6)
  try {
    await preloadImages([ZEE9_LOGO, ZEE9_LOGO_PNG], { concurrency: 2 })
    onProgress?.(12)

    switch (gameId) {
      case 'money-coming':
        await import('../games/engines/moneyComingAssets').then((m) =>
          m.preloadMoneyComingAssets((loaded, total) => {
            onProgress?.(12 + Math.round((loaded / Math.max(1, total)) * 88))
          }),
        )
        break
      case 'fortune-gems-2':
        await import('../games/fortune-gems-2/constants/assetManifest').then((m) =>
          m.preloadFortuneGems2Assets((pct) => onProgress?.(12 + Math.round(pct * 0.88))),
        )
        break
      case 'bounty-trail':
      case 'wild-bounty':
        await import('../games/bounty-trail/constants/assetManifest').then((m) =>
          m.preloadBountyBoot((loaded, total) => {
            onProgress?.(12 + Math.round((loaded / Math.max(1, total)) * 88))
          }),
        )
        break
      case 'aero-x':
        await import('../games/aero-x/constants/assetManifest').then((m) =>
          withProgress(m.BOOT_ASSETS, (p) => onProgress?.(12 + Math.round(p * 0.88))),
        )
        break
      case 'double-crash':
        await import('../games/double-crash/constants/assetManifest').then((m) =>
          withProgress(m.BOOT_ASSETS, (p) => onProgress?.(12 + Math.round(p * 0.88))),
        )
        break
      case 'chicken-road':
        await import('../games/chicken-road/constants/assetManifest').then((m) =>
          withProgress(m.ALL_ASSETS, (p) => onProgress?.(12 + Math.round(p * 0.88)), 10),
        )
        break
      case 'dragon-tiger':
        await import('../games/dragon-tiger/constants/assetManifest').then(async (m) => {
          const { CRITICAL_ASSETS } = await import(
            '../games/dragon-tiger/constants/gameConfig'
          )
          await withProgress(
            [...m.BOOT_ASSETS, ...CRITICAL_ASSETS],
            (p) => onProgress?.(12 + Math.round(p * 0.88)),
          )
        })
        break
      case 'car-roulette':
        await import('../games/car-roulette/constants/assetManifest').then((m) =>
          withProgress(m.BOOT_ASSETS, (p) => onProgress?.(12 + Math.round(p * 0.88))),
        )
        break
      case 'zoo-roulette':
        await import('../games/zoo-roulette/constants/assetManifest').then((m) =>
          withProgress(m.BOOT_ASSETS, (p) => onProgress?.(12 + Math.round(p * 0.88))),
        )
        break
      case 'roulette':
        await import('../games/roulette/constants/rouletteConfig').then((m) =>
          withProgress(m.CRITICAL_ASSETS, (p) => onProgress?.(12 + Math.round(p * 0.88))),
        )
        break
      case 'super-ace':
        try {
          await import('../games/super-ace/constants/assetManifest').then((m) =>
            m.preloadSuperAceAssets((pct: number) =>
              onProgress?.(12 + Math.round(pct * 0.88)),
            ),
          )
        } catch {
          onProgress?.(100)
        }
        break
      case 'double-fortune':
        try {
          await import('../games/double-fortune/constants/assetManifest').then((m) =>
            m.preloadDoubleFortuneAssets((pct: number) =>
              onProgress?.(12 + Math.round(pct * 0.88)),
            ),
          )
        } catch {
          onProgress?.(100)
        }
        break
      case 'mines':
        await withProgress(MINES_ASSETS, (p) => onProgress?.(12 + Math.round(p * 0.88)))
        break
      case 'crash':
        await withProgress(Object.values(CRASH_ASSETS), (p) =>
          onProgress?.(12 + Math.round(p * 0.88)),
        )
        break
      case 'aviator':
        await withProgress(AVIATOR_ASSETS, (p) => onProgress?.(12 + Math.round(p * 0.88)))
        break
      case 'wingo-lottery':
        await import('../games/engines/wingoLottery').then((m) =>
          m.preloadCasinoAssets((loaded, total) => {
            onProgress?.(12 + Math.round((loaded / Math.max(1, total)) * 88))
          }),
        )
        break
      case 'wingo':
        await withProgress(WINGO_UI_ASSETS, (p) => onProgress?.(12 + Math.round(p * 0.88)))
        break
      case '7up-down':
        await withProgress(SEVEN_UP_ASSETS, (p) => onProgress?.(12 + Math.round(p * 0.88)))
        break
      case 'jhandi-munda':
        await withProgress(JHANDI_BOOT.slice(0, 8), (p) => onProgress?.(12 + Math.round(p * 0.88)))
        break
      default: {
        const g = S9_GAMES.find((x) => x.id === gameId)
        const thumb = g ? getGameThumb(g) : `/games/${gameId}.webp`
        await withProgress(thumbWithFallback(thumb), (p) =>
          onProgress?.(12 + Math.round(p * 0.88)),
        )
        break
      }
    }
  } catch {
    onProgress?.(100)
  }
  onProgress?.(100)
}
