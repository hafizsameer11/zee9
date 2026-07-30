/** Critical Money Coming assets — preload before showing the table. */
export const MC_ASSETS = {
  bg: '/games/money-coming/bg.png',
  frame: '/games/money-coming/ui/ys_frame_slot.png',
  logo: '/games/money-coming/ui/logo_en_1685597575.png',
  wheel: '/games/money-coming/ui/wheel_generated.png',
  spinBg: '/games/money-coming/ui/spin_bg.png',
  spinArrow: '/games/money-coming/ui/btn_ks2.png',
  spinWord: '/games/money-coming/ui/ty_img_Spin.png',
  auto: '/games/money-coming/ui/yx_img_btn_autospin.png',
  add: '/games/money-coming/ui/ty_btn_chipsadd.png',
  betCoin: '/games/money-coming/ui/btn_jb.png',
  infoBg: '/games/money-coming/ui/bet_img_frame.png',
  infoBg2: '/games/money-coming/ui/bet_img_frame1.png',
  scatterRow: '/games/money-coming/ui/yx_img_bet_50.png',
  unlock10: '/games/money-coming/ui/bet_img_10x.png',
  mult10: '/games/money-coming/ui/yx_img_bet_10.png',
  respin: '/games/money-coming/ui/yx_img_respin.png',
  badge: '/games/money-coming/badge.png',
  thumb: '/games/money-coming.png',
} as const

export const MC_AUDIO = {
  spin: '/games/money-coming/spin.mp3',
  click: '/games/money-coming/click.mp3',
} as const

export const MC_FONT = '/games/money-coming/BahnschriftCondensed.ttf'

const PRELOAD_URLS: string[] = [
  MC_ASSETS.bg,
  MC_ASSETS.frame,
  MC_ASSETS.logo,
  MC_ASSETS.wheel,
  MC_ASSETS.spinBg,
  MC_ASSETS.spinArrow,
  MC_ASSETS.spinWord,
  MC_ASSETS.auto,
  MC_ASSETS.add,
  MC_ASSETS.betCoin,
  MC_ASSETS.infoBg,
  MC_ASSETS.infoBg2,
  MC_ASSETS.scatterRow,
  MC_ASSETS.unlock10,
  MC_ASSETS.mult10,
  MC_ASSETS.respin,
  MC_ASSETS.badge,
]

let preloadPromise: Promise<void> | null = null
let preloadDone = false

function loadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  })
}

function loadFont(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return Promise.resolve()
  try {
    const face = new FontFace('McBahn', `url(${MC_FONT})`, { weight: '400 700' })
    return face
      .load()
      .then((f) => {
        document.fonts.add(f)
      })
      .catch(() => undefined)
  } catch {
    return Promise.resolve()
  }
}

function warmAudio(src: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const a = new Audio()
      a.preload = 'auto'
      a.oncanplaythrough = () => resolve()
      a.onerror = () => resolve()
      // Some browsers never fire canplaythrough for muted preload — time-box
      window.setTimeout(() => resolve(), 2500)
      a.src = src
      a.load()
    } catch {
      resolve()
    }
  })
}

/** Start (or reuse) asset preload. Safe to call from lobby + game. */
export function preloadMoneyComingAssets(
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  if (preloadDone) {
    onProgress?.(PRELOAD_URLS.length, PRELOAD_URLS.length)
    return Promise.resolve()
  }
  if (preloadPromise) return preloadPromise

  const total = PRELOAD_URLS.length + 3 // images + font + 2 audio
  let loaded = 0
  const tick = () => {
    loaded += 1
    onProgress?.(Math.min(loaded, total), total)
  }

  preloadPromise = (async () => {
    await Promise.all([
      ...PRELOAD_URLS.map((url) => loadImage(url).then(tick)),
      loadFont().then(tick),
      warmAudio(MC_AUDIO.spin).then(tick),
      warmAudio(MC_AUDIO.click).then(tick),
    ])
    preloadDone = true
  })()

  return preloadPromise
}

export function isMoneyComingAssetsReady() {
  return preloadDone
}
