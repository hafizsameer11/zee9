import { useCallback, useEffect, useRef, useState } from 'react'
import { sound } from '../../../lib/sound'

export type BountySfx =
  | 'button'
  | 'bet'
  | 'spin'
  | 'stop'
  | 'wild'
  | 'scatter'
  | 'gold'
  | 'coin'
  | 'win'
  | 'bigwin'
  | 'feature'
  | 'freespins'
  | 'error'

const MAP: Record<BountySfx, Parameters<typeof sound.play>[0]> = {
  button: 'tap',
  bet: 'chip',
  spin: 'spin',
  stop: 'tap',
  wild: 'gem',
  scatter: 'bonus',
  gold: 'reveal',
  coin: 'coin',
  win: 'win',
  bigwin: 'success',
  feature: 'bonus',
  freespins: 'levelUp',
  error: 'error',
}

export function useBountyTrailSound() {
  const [muted, setMuted] = useState(false)
  const unlocked = useRef(false)

  useEffect(() => {
    try {
      setMuted(localStorage.getItem('bt-muted') === '1')
    } catch {
      /* ignore */
    }
  }, [])

  const unlock = useCallback(() => {
    if (unlocked.current) return
    unlocked.current = true
    void sound.unlock()
    void sound.preload(['spin', 'click', 'chip', 'win', 'lose', 'tap', 'whoosh', 'coin', 'bonus', 'gem', 'reveal', 'success', 'levelUp', 'error'])
  }, [])

  const play = useCallback(
    (id: BountySfx, volume = 0.55) => {
      if (muted) return
      unlock()
      sound.play(MAP[id], { volume })
    },
    [muted, unlock],
  )

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      try {
        localStorage.setItem('bt-muted', next ? '1' : '0')
      } catch {
        /* ignore */
      }
      if (!next) unlock()
      return next
    })
  }, [unlock])

  return { muted, toggleMute, play, unlock }
}
