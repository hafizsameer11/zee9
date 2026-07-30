import { useCallback, useRef, useState } from 'react'
import { sound } from '../../../lib/sound'
import type { SfxId } from '../../../lib/sound/soundIds'

export type AeroSound =
  | 'click'
  | 'bet'
  | 'cashout'
  | 'countdown'
  | 'launch'
  | 'fly'
  | 'flewAway'
  | 'tick'
  | 'error'
  | 'whoosh'

const MAP: Record<AeroSound, SfxId> = {
  click: 'softClick',
  bet: 'bet',
  cashout: 'cashout',
  countdown: 'countdown',
  launch: 'whoosh',
  fly: 'tick',
  flewAway: 'whoosh',
  tick: 'tick',
  error: 'error',
  whoosh: 'whoosh',
}

export function useAeroXSound() {
  const [muted, setMuted] = useState(() => {
    try {
      return sound.getPrefs().sfx === false
    } catch {
      return false
    }
  })
  const mutedRef = useRef(muted)
  mutedRef.current = muted

  const play = useCallback((id: AeroSound) => {
    if (mutedRef.current) return
    try {
      sound.play(MAP[id])
    } catch {
      /* ignore */
    }
  }, [])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      try {
        sound.setPrefs({ sfx: !next })
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return { muted, toggleMute, play }
}
