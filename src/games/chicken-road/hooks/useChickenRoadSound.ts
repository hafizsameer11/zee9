import { useCallback, useEffect, useRef, useState } from 'react'
import { sound } from '../../../lib/sound'
import { ASSET } from '../constants/gameConfig'
import { SOUND_FILES, type SoundFileId } from '../constants/assetManifest'

export type ChickenSoundEvent =
  | 'button'
  | 'betChange'
  | 'difficulty'
  | 'roundStart'
  | 'chickenIdle'
  | 'chickenJump'
  | 'chickenLand'
  | 'engine'
  | 'horn'
  | 'warning'
  | 'collision'
  | 'feather'
  | 'stepSuccess'
  | 'multiplier'
  | 'pass'
  | 'cashout'
  | 'coin'
  | 'win'
  | 'loss'
  | 'menuOpen'
  | 'menuClose'

const EVENT_TO_FILE: Record<ChickenSoundEvent, SoundFileId> = {
  button: 'button',
  betChange: 'bet-change',
  difficulty: 'difficulty',
  roundStart: 'round-start',
  chickenIdle: 'chicken-idle',
  chickenJump: 'chicken-jump',
  chickenLand: 'chicken-land',
  engine: 'engine',
  horn: 'horn',
  warning: 'warning',
  collision: 'collision',
  feather: 'feather',
  stepSuccess: 'step-success',
  multiplier: 'multiplier',
  pass: 'pass',
  cashout: 'cashout',
  coin: 'coin',
  win: 'win',
  loss: 'loss',
  menuOpen: 'menu-open',
  menuClose: 'menu-close',
}

/** Map common generic ids used by UI onto chicken-road events. */
const ALIAS: Record<string, ChickenSoundEvent> = {
  click: 'button',
  button: 'button',
  bet: 'betChange',
  betChange: 'betChange',
  difficulty: 'difficulty',
  start: 'roundStart',
  roundStart: 'roundStart',
  jump: 'chickenJump',
  land: 'chickenLand',
  idle: 'chickenIdle',
  engine: 'engine',
  horn: 'horn',
  warning: 'warning',
  collision: 'collision',
  hit: 'collision',
  feather: 'feather',
  success: 'stepSuccess',
  stepSuccess: 'stepSuccess',
  multiplier: 'multiplier',
  pass: 'pass',
  cashout: 'cashout',
  coin: 'coin',
  win: 'win',
  loss: 'loss',
  lose: 'loss',
  menuOpen: 'menuOpen',
  menuClose: 'menuClose',
}

function playLocalWav(file: SoundFileId, volume: number) {
  try {
    const a = new Audio(ASSET.sound(file))
    a.volume = Math.max(0, Math.min(1, volume))
    void a.play().catch(() => {
      /* missing / blocked — never crash */
    })
  } catch {
    /* ignore */
  }
}

export function useChickenRoadSound() {
  const [muted, setMuted] = useState(() => {
    try {
      return sound.getPrefs().sfx === false
    } catch {
      return false
    }
  })
  const [musicOn, setMusicOn] = useState(() => {
    try {
      return sound.getPrefs().music !== false
    } catch {
      return true
    }
  })

  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const musicRef = useRef(musicOn)
  musicRef.current = musicOn
  const musicAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      const a = musicAudioRef.current
      if (a) {
        try {
          a.pause()
          a.src = ''
        } catch {
          /* ignore */
        }
        musicAudioRef.current = null
      }
    }
  }, [])

  const play = useCallback((event: string, opts?: { volume?: number }) => {
    if (mutedRef.current) return
    const mapped = ALIAS[event] ?? (event as ChickenSoundEvent)
    const file = EVENT_TO_FILE[mapped]
    if (!file) return
    const vol = opts?.volume ?? 0.85
    try {
      // Prefer global click/coin when available; always fall back to local wav.
      if (mapped === 'button') sound.playClick()
      else if (mapped === 'coin' || mapped === 'win') sound.play('coin', { volume: vol })
      else if (mapped === 'loss') sound.play('lose', { volume: vol })
    } catch {
      /* ignore */
    }
    playLocalWav(file, vol)
  }, [])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      try {
        sound.setPrefs({ sfx: !next })
      } catch {
        /* ignore */
      }
      if (!next) sound.playClick()
      return next
    })
  }, [])

  const toggleMusic = useCallback(() => {
    setMusicOn((on) => {
      const next = !on
      try {
        sound.setPrefs({ music: next })
      } catch {
        /* ignore */
      }
      const existing = musicAudioRef.current
      if (!next) {
        if (existing) {
          try {
            existing.pause()
          } catch {
            /* ignore */
          }
        }
      }
      return next
    })
  }, [])

  return {
    muted,
    musicOn,
    toggleMute,
    toggleMusic,
    play,
    soundFiles: SOUND_FILES,
  }
}
