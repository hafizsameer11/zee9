import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sound } from '../../../lib/sound'
import { BOOT_ASSETS, GAMEPLAY_ASSETS } from '../constants/assetManifest'
import { playCrSfx, preloadCrSfx } from '../services/soundService'
import type { CarRouletteSfx } from './useCarRoulette'

export function useCarRouletteSound() {
  const [muted, setMuted] = useState(() => {
    try {
      return sound.getPrefs().sfx === false
    } catch {
      return false
    }
  })
  const lastAt = useRef<Partial<Record<CarRouletteSfx, number>>>({})

  useEffect(() => {
    void preloadCrSfx()
  }, [])

  /** Throttled per-cue so overlapping chip and tick events never pile up. */
  const play = useCallback(
    (id: CarRouletteSfx, volume = 1) => {
      if (muted) return
      const gap = id === 'trackTick' ? 45 : id === 'chip' || id === 'whoosh' ? 70 : 0
      if (gap) {
        const t = performance.now()
        if (t - (lastAt.current[id] ?? 0) < gap) return
        lastAt.current[id] = t
      }
      playCrSfx(id, volume)
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

export function usePageVisible() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
  return visible
}

function preloadList(urls: readonly string[], onProgress?: (pct: number) => void) {
  const unique = [...new Set(urls)]
  return new Promise<void>((resolve) => {
    if (!unique.length) {
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

export function usePreloadAssets() {
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState(0)
  const [slow, setSlow] = useState(false)
  const required = useMemo(() => BOOT_ASSETS, [])

  useEffect(() => {
    let cancelled = false
    const nudge = window.setTimeout(() => !cancelled && setSlow(true), 6000)
    const safety = window.setTimeout(() => {
      if (cancelled) return
      setProgress(100)
      setReady(true)
    }, 14000)

    void (async () => {
      await preloadList(required, (pct) => !cancelled && setProgress(pct))
      if (cancelled) return
      setProgress(100)
      setReady(true)
      void preloadList(GAMEPLAY_ASSETS)
    })()

    return () => {
      cancelled = true
      window.clearTimeout(nudge)
      window.clearTimeout(safety)
    }
  }, [required])

  return { ready, progress, slow }
}
