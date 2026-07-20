import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { sound } from './SoundManager'
import { DEFAULT_PREFS, type SoundPrefs, type SfxId } from './soundIds'

type Ctx = {
  prefs: SoundPrefs
  setPrefs: (p: Partial<SoundPrefs>) => void
  play: (id: SfxId, opts?: { volume?: number; force?: boolean }) => void
  playClick: () => void
}

const SoundCtx = createContext<Ctx | null>(null)

export function SoundProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<SoundPrefs>(() => sound.getPrefs())

  const setPrefs = useCallback((patch: Partial<SoundPrefs>) => {
    sound.setPrefs(patch)
    setPrefsState(sound.getPrefs())
  }, [])

  const play = useCallback((id: SfxId, opts?: { volume?: number; force?: boolean }) => {
    sound.play(id, opts)
  }, [])

  const playClick = useCallback(() => {
    sound.playClick()
    sound.vibrate(8)
  }, [])

  useEffect(() => {
    const unlock = () => {
      void sound.unlock()
    }

    // Keep trying until AudioContext is running (browsers require a gesture).
    const onGesture = () => {
      unlock()
      if (sound.isUnlocked()) {
        window.removeEventListener('pointerdown', onGesture, true)
        window.removeEventListener('touchstart', onGesture, true)
        window.removeEventListener('keydown', onGesture, true)
      }
    }

    window.addEventListener('pointerdown', onGesture, { capture: true })
    window.addEventListener('touchstart', onGesture, { capture: true, passive: true })
    window.addEventListener('keydown', onGesture, { capture: true })

    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null
      if (!el) return
      const hit = el.closest(
        'button, a, [role="button"], .sfx-click, [data-sfx], input[type="submit"], input[type="button"]',
      ) as HTMLElement | null
      if (!hit) return
      if (hit.hasAttribute('disabled') || hit.getAttribute('aria-disabled') === 'true') return

      void sound.unlock()

      const custom = hit.getAttribute('data-sfx') as SfxId | null
      if (custom) {
        sound.play(custom)
        sound.vibrate(10)
        return
      }
      sound.playClick()
      sound.vibrate(8)
    }

    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('pointerdown', onGesture, true)
      window.removeEventListener('touchstart', onGesture, true)
      window.removeEventListener('keydown', onGesture, true)
      document.removeEventListener('click', onClick, true)
    }
  }, [])

  const value = useMemo(
    () => ({ prefs, setPrefs, play, playClick }),
    [prefs, setPrefs, play, playClick],
  )

  return <SoundCtx.Provider value={value}>{children}</SoundCtx.Provider>
}

export function useSound() {
  const ctx = useContext(SoundCtx)
  if (!ctx) {
    return {
      prefs: DEFAULT_PREFS,
      setPrefs: () => {},
      play: (id: SfxId, opts?: { volume?: number; force?: boolean }) => sound.play(id, opts),
      playClick: () => sound.playClick(),
    }
  }
  return ctx
}
