import { useCallback, useEffect, useMemo, useState } from 'react'
import { sound } from '../../../lib/sound'
import { CRITICAL_ASSETS } from '../constants/gameConfig'
import { BOOT_ASSETS, GAMEPLAY_ASSETS } from '../constants/assetManifest'
import { playDtSfx, preloadDtSfx, type DtSfxKey } from '../services/soundService'

const EVENT_MAP: Record<string, DtSfxKey> = {
  click: 'buttonPress',
  chip: 'chipAdd',
  chipSelect: 'chipSelect',
  chipLand: 'chipLand',
  whoosh: 'chipFlight',
  countdown: 'countdown',
  stop: 'stopBetting',
  deal: 'cardDeal',
  flip: 'cardFlip',
  dragon: 'dragonEnter',
  dragonRoar: 'dragonRoar',
  tiger: 'tigerEnter',
  tigerRoar: 'tigerRoar',
  tie: 'tieEnergy',
  win: 'victory',
  lose: 'lose',
  highlight: 'winHighlight',
  coin: 'coinPayout',
  error: 'error',
  tick: 'tick',
}

export function useDragonTigerSound() {
  const [muted, setMuted] = useState(() => {
    try {
      return sound.getPrefs().sfx === false
    } catch {
      return false
    }
  })

  useEffect(() => {
    void preloadDtSfx()
  }, [])

  const play = useCallback(
    (id: string) => {
      if (muted) return
      const key = EVENT_MAP[id]
      if (key) playDtSfx(key)
    },
    [muted],
  )

  const toggle = useCallback(() => {
    setMuted((m) => {
      const next = !m
      sound.setPrefs({ sfx: !next })
      return next
    })
    sound.playClick()
  }, [])

  return { muted, toggle, play }
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])
  return reduced
}

function preloadList(urls: readonly string[], onProgress?: (pct: number) => void) {
  const unique = [...new Set(urls)]
  return new Promise<void>((resolve) => {
    if (unique.length === 0) {
      onProgress?.(100)
      resolve()
      return
    }
    let done = 0
    const bump = () => {
      done += 1
      onProgress?.(Math.min(100, Math.round((done / unique.length) * 100)))
      if (done >= unique.length) resolve()
    }
    for (const src of unique) {
      const img = new Image()
      img.decoding = 'async'
      img.onload = bump
      img.onerror = bump
      img.src = src
    }
  })
}

/**
 * Block the table until boot scene + header characters + chips are loaded.
 * Win-pose layers warm after play starts.
 */
export function usePreloadAssets() {
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState(0)
  const required = useMemo(() => [...BOOT_ASSETS, ...CRITICAL_ASSETS], [])

  useEffect(() => {
    let cancelled = false

    const safety = window.setTimeout(() => {
      if (!cancelled) {
        setProgress(100)
        setReady(true)
      }
    }, 12000)

    void (async () => {
      await preloadList(required, (pct) => {
        if (!cancelled) setProgress(pct)
      })
      if (cancelled) return
      setProgress(100)
      setReady(true)
      void preloadList(GAMEPLAY_ASSETS)
    })()

    return () => {
      cancelled = true
      window.clearTimeout(safety)
    }
  }, [required])

  return { ready, progress }
}

export function usePageVisible() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
  return visible
}
