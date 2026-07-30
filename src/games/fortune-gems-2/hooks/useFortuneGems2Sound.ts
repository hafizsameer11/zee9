import { useCallback, useEffect, useRef, useState } from 'react'
import { sound } from '../../../lib/sound'

export type Fg2Sfx =
  | 'button'
  | 'spin'
  | 'reelStop'
  | 'win'
  | 'bigwin'
  | 'wild'
  | 'wheelStart'
  | 'wheelTick'
  | 'wheelWin'
  | 'multMove'
  | 'multLock'
  | 'bonus'
  | 'error'
  | 'coin'

const MAP: Record<Fg2Sfx, Parameters<typeof sound.play>[0]> = {
  button: 'tap',
  spin: 'spin',
  reelStop: 'softClick',
  win: 'win',
  bigwin: 'success',
  wild: 'gem',
  wheelStart: 'whoosh',
  wheelTick: 'tick',
  wheelWin: 'bonus',
  multMove: 'tick',
  multLock: 'reveal',
  bonus: 'bonus',
  error: 'error',
  coin: 'coin',
}

export function useFortuneGems2Sound() {
  const [muted, setMuted] = useState(false)
  const unlocked = useRef(false)

  useEffect(() => {
    try {
      setMuted(localStorage.getItem('fg2-muted') === '1')
    } catch {
      /* ignore */
    }
  }, [])

  const unlock = useCallback(() => {
    if (unlocked.current) return
    unlocked.current = true
    void sound.unlock()
    void sound.preload([
      'spin',
      'click',
      'tap',
      'softClick',
      'tick',
      'whoosh',
      'win',
      'success',
      'bonus',
      'gem',
      'reveal',
      'coin',
      'error',
      'levelUp',
    ])
  }, [])

  const play = useCallback(
    (id: Fg2Sfx, volume = 0.55) => {
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
        localStorage.setItem('fg2-muted', next ? '1' : '0')
      } catch {
        /* ignore */
      }
      if (!next) unlock()
      return next
    })
  }, [unlock])

  return { muted, toggleMute, play, unlock }
}
