import { useCallback, useEffect, useRef, useState } from 'react'
import { BASE } from '../constants/gameConfig'

export type SuperAceSfx =
  | 'button'
  | 'bet'
  | 'spin'
  | 'cardLand'
  | 'cascade'
  | 'remove'
  | 'wild'
  | 'scatter'
  | 'gold'
  | 'combo'
  | 'combo1'
  | 'combo2'
  | 'combo3'
  | 'win'
  | 'bigwin'
  | 'superwin'
  | 'coin'
  | 'feature'
  | 'freespins'
  | 'error'
  | 'ambience'

const FILES: Record<SuperAceSfx, string | string[]> = {
  button: 'btn.mp3',
  bet: 'bet.mp3',
  spin: 'spin.mp3',
  cardLand: ['card0.mp3', 'card1.mp3', 'card2.mp3'],
  cascade: 'drop.mp3',
  remove: 'burn.mp3',
  wild: 'wild.mp3',
  scatter: 'scatter.mp3',
  gold: 'gold.mp3',
  combo: 'combo0.mp3',
  combo1: 'combo1.mp3',
  combo2: 'combo2.mp3',
  combo3: 'combo3.mp3',
  win: 'win.mp3',
  bigwin: 'bigwin.mp3',
  superwin: 'superwin.mp3',
  coin: 'coins.mp3',
  feature: 'feature.mp3',
  freespins: 'feature.mp3',
  error: 'btn.mp3',
  ambience: 'ambience.mp3',
}

const VOL: Partial<Record<SuperAceSfx, number>> = {
  button: 0.45,
  bet: 0.5,
  spin: 0.55,
  cardLand: 0.4,
  cascade: 0.5,
  remove: 0.55,
  wild: 0.7,
  scatter: 0.65,
  gold: 0.55,
  combo: 0.55,
  combo1: 0.6,
  combo2: 0.65,
  combo3: 0.75,
  win: 0.6,
  bigwin: 0.75,
  superwin: 0.85,
  coin: 0.55,
  feature: 0.7,
  freespins: 0.7,
  ambience: 0.22,
}

function url(file: string) {
  return `${BASE}/sfx/${file}`
}

/**
 * Dedicated WebAudio player for Royal Ace — does not reuse lobby SFX.
 */
export function useSuperAceSound() {
  const [muted, setMuted] = useState(false)
  const unlocked = useRef(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const buffers = useRef(new Map<string, AudioBuffer>())
  const loading = useRef(new Map<string, Promise<AudioBuffer | null>>())
  const cardIdx = useRef(0)
  const ambienceSrc = useRef<AudioBufferSourceNode | null>(null)

  useEffect(() => {
    try {
      setMuted(localStorage.getItem('sa-muted') === '1')
    } catch {
      /* ignore */
    }
  }, [])

  const ensureCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    const ctx = new AC()
    const master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)
    ctxRef.current = ctx
    masterRef.current = master
    return ctx
  }, [])

  const loadFile = useCallback(async (file: string) => {
    const cached = buffers.current.get(file)
    if (cached) return cached
    const pending = loading.current.get(file)
    if (pending) return pending
    const job = (async () => {
      try {
        const res = await fetch(url(file))
        if (!res.ok) return null
        const ab = await res.arrayBuffer()
        const ctx = ensureCtx()
        if (!ctx) return null
        const buf = await ctx.decodeAudioData(ab.slice(0))
        buffers.current.set(file, buf)
        return buf
      } catch {
        return null
      } finally {
        loading.current.delete(file)
      }
    })()
    loading.current.set(file, job)
    return job
  }, [ensureCtx])

  const unlock = useCallback(() => {
    if (unlocked.current) return
    unlocked.current = true
    const ctx = ensureCtx()
    if (ctx?.state === 'suspended') void ctx.resume()
    // preload critical
    const files = [
      'btn.mp3',
      'spin.mp3',
      'card0.mp3',
      'card1.mp3',
      'card2.mp3',
      'burn.mp3',
      'drop.mp3',
      'win.mp3',
      'combo0.mp3',
      'combo1.mp3',
      'combo2.mp3',
      'combo3.mp3',
      'wild.mp3',
      'scatter.mp3',
      'superwin.mp3',
      'coins.mp3',
      'bigwin.mp3',
      'feature.mp3',
      'gold.mp3',
      'bet.mp3',
    ]
    void Promise.all(files.map((f) => loadFile(f)))
  }, [ensureCtx, loadFile])

  const playBuffer = useCallback(
    (buf: AudioBuffer, volume: number, rate = 1) => {
      const ctx = ensureCtx()
      const master = masterRef.current
      if (!ctx || !master) return
      if (ctx.state === 'suspended') void ctx.resume()
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.playbackRate.value = rate
      const g = ctx.createGain()
      g.gain.value = Math.max(0, Math.min(1, volume))
      src.connect(g)
      g.connect(master)
      src.start(0)
    },
    [ensureCtx],
  )

  const play = useCallback(
    (id: SuperAceSfx, volume?: number) => {
      if (muted) return
      unlock()
      const entry = FILES[id]
      if (!entry) return
      let file: string
      if (Array.isArray(entry)) {
        file = entry[cardIdx.current % entry.length]!
        cardIdx.current += 1
      } else {
        file = entry
      }
      const vol = volume ?? VOL[id] ?? 0.55
      void loadFile(file).then((buf) => {
        if (buf) playBuffer(buf, vol)
      })
    },
    [loadFile, muted, playBuffer, unlock],
  )

  /** Rising combo tone by cascade index 0..3 */
  const playCombo = useCallback(
    (comboIndex: number) => {
      const ids: SuperAceSfx[] = ['combo', 'combo1', 'combo2', 'combo3']
      play(ids[Math.min(3, Math.max(0, comboIndex))]!)
    },
    [play],
  )

  const startAmbience = useCallback(() => {
    if (muted) return
    unlock()
    void loadFile('ambience.mp3').then((buf) => {
      const ctx = ensureCtx()
      const master = masterRef.current
      if (!buf || !ctx || !master) return
      try {
        ambienceSrc.current?.stop()
      } catch {
        /* ignore */
      }
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.loop = true
      const g = ctx.createGain()
      g.gain.value = VOL.ambience ?? 0.2
      src.connect(g)
      g.connect(master)
      src.start(0)
      ambienceSrc.current = src
    })
  }, [ensureCtx, loadFile, muted, unlock])

  const stopAmbience = useCallback(() => {
    try {
      ambienceSrc.current?.stop()
    } catch {
      /* ignore */
    }
    ambienceSrc.current = null
  }, [])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      try {
        localStorage.setItem('sa-muted', next ? '1' : '0')
      } catch {
        /* ignore */
      }
      if (next) stopAmbience()
      else unlock()
      return next
    })
  }, [stopAmbience, unlock])

  useEffect(
    () => () => {
      stopAmbience()
    },
    [stopAmbience],
  )

  return { muted, toggleMute, play, playCombo, unlock, startAmbience, stopAmbience }
}
