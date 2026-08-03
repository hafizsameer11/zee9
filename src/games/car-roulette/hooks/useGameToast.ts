import { useCallback, useEffect, useRef } from 'react'

/** Auto-clearing toast for GamePlay's top banner. */
export function useGameToast(onMessage?: (msg: string | null) => void) {
  const timer = useRef(0)

  const toast = useCallback(
    (message: string | null, ms = 2200) => {
      if (timer.current) window.clearTimeout(timer.current)
      onMessage?.(message)
      if (message) {
        timer.current = window.setTimeout(() => onMessage?.(null), ms)
      }
    },
    [onMessage],
  )

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  return toast
}
