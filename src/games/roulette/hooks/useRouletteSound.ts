import { useCallback, useEffect, useMemo, useState } from 'react'
import { sound } from '../../../lib/sound'
import { playRouletteSfx, preloadRouletteSfx, type RouletteSfxKey } from '../services/rouletteSoundService'
import { ASSET, CRITICAL_ASSETS } from '../constants/rouletteConfig'

const EVENT_MAP: Record<string, RouletteSfxKey> = {
  chip: 'chipPlace',
  softClick: 'betRemoved',
  click: 'buttonPress',
  countdown: 'bettingClosing',
  close: 'betsClosed',
  spin: 'wheelSpinning',
  reveal: 'resultReveal',
  win: 'winPayout',
  lose: 'lose',
  error: 'error',
  coin: 'winPayout',
}

export function useRouletteSound() {
  const [muted, setMuted] = useState(() => {
    try {
      return sound.getPrefs().sfx === false
    } catch {
      return false
    }
  })

  useEffect(() => {
    void preloadRouletteSfx()
  }, [])

  const play = useCallback(
    (id: string) => {
      if (muted) return
      const key = EVENT_MAP[id]
      if (key) playRouletteSfx(key)
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

export function usePreloadAssets() {
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState(0)
  const list = useMemo(() => CRITICAL_ASSETS, [])

  useEffect(() => {
    let cancelled = false
    let done = 0
    const total = list.length

    const bump = () => {
      done += 1
      if (!cancelled) {
        setProgress(Math.min(100, Math.round((done / total) * 100)))
        if (done >= total) setReady(true)
      }
    }

    for (const src of list) {
      const img = new Image()
      img.onload = bump
      img.onerror = bump
      img.src = src
    }

    // Safety timeout so a hung image never blocks forever
    const t = window.setTimeout(() => {
      if (!cancelled) {
        setProgress(100)
        setReady(true)
      }
    }, 8000)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [list])

  return { ready, progress, emblem: ASSET.emblem }
}
