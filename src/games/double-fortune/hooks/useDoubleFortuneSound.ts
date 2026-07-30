import { useCallback, useEffect, useRef, useState } from 'react'
import { BASE } from '../constants/gameConfig'

export type DfSfx =
  | 'button'
  | 'bet'
  | 'spin'
  | 'reelstop'
  | 'wild'
  | 'scatter'
  | 'win'
  | 'bigwin'
  | 'freespin'
  | 'turbo'
  | 'coin'
  | 'chime'
  | 'curtain'
  | 'ambience'

const FILES: Record<DfSfx, string> = {
  button: 'button.mp3',
  bet: 'bet.mp3',
  spin: 'spin.mp3',
  reelstop: 'reelstop.mp3',
  wild: 'wild.mp3',
  scatter: 'scatter.mp3',
  win: 'win.mp3',
  bigwin: 'bigwin.mp3',
  freespin: 'freespin.mp3',
  turbo: 'turbo.mp3',
  coin: 'coin.mp3',
  chime: 'chime.mp3',
  curtain: 'curtain.mp3',
  ambience: 'ambience.mp3',
}

export function useDoubleFortuneSound() {
  const [muted, setMuted] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const buffers = useRef<Partial<Record<DfSfx, AudioBuffer>>>({})
  const ambRef = useRef<AudioBufferSourceNode | null>(null)
  const unlocked = useRef(false)

  useEffect(() => {
    try {
      setMuted(localStorage.getItem('df-muted') === '1')
    } catch {
      /* ignore */
    }
  }, [])

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      if (!Ctx) return null
      ctxRef.current = new Ctx()
      gainRef.current = ctxRef.current.createGain()
      gainRef.current.connect(ctxRef.current.destination)
    }
    return ctxRef.current
  }, [])

  const loadOne = useCallback(async (id: DfSfx) => {
    if (buffers.current[id]) return
    const ctx = ensureCtx()
    if (!ctx) return
    try {
      const res = await fetch(`${BASE}/sfx/${FILES[id]}`)
      const buf = await res.arrayBuffer()
      buffers.current[id] = await ctx.decodeAudioData(buf.slice(0))
    } catch {
      /* ignore */
    }
  }, [ensureCtx])

  const unlock = useCallback(() => {
    if (unlocked.current) return
    unlocked.current = true
    const ctx = ensureCtx()
    void ctx?.resume()
    void Promise.all((Object.keys(FILES) as DfSfx[]).map(loadOne))
  }, [ensureCtx, loadOne])

  const play = useCallback(
    (id: DfSfx, volume = 0.5) => {
      if (muted) return
      unlock()
      const ctx = ctxRef.current
      const gain = gainRef.current
      const buf = buffers.current[id]
      if (!ctx || !gain || !buf) {
        void loadOne(id)
        return
      }
      const src = ctx.createBufferSource()
      src.buffer = buf
      const g = ctx.createGain()
      g.gain.value = volume
      src.connect(g)
      g.connect(gain)
      src.start(0)
    },
    [loadOne, muted, unlock],
  )

  const startAmbience = useCallback(() => {
    if (muted) return
    unlock()
    const ctx = ctxRef.current
    const gain = gainRef.current
    const buf = buffers.current.ambience
    if (!ctx || !gain || !buf || ambRef.current) return
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const g = ctx.createGain()
    g.gain.value = 0.12
    src.connect(g)
    g.connect(gain)
    src.start(0)
    ambRef.current = src
  }, [muted, unlock])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      try {
        localStorage.setItem('df-muted', next ? '1' : '0')
      } catch {
        /* ignore */
      }
      if (next && ambRef.current) {
        try {
          ambRef.current.stop()
        } catch {
          /* ignore */
        }
        ambRef.current = null
      }
      if (!next) unlock()
      return next
    })
  }, [unlock])

  return { muted, toggleMute, play, unlock, startAmbience }
}
