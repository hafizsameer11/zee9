import { useCallback, useEffect, useRef, useState } from 'react'
import { SPIN_DURATION_MS } from '../constants/rouletteConfig'
import {
  ballBounceOffset,
  computeSpinLanding,
  easeOutCubic,
  easeOutQuint,
  normalizeAngle,
} from '../utils/rouletteMath'

export type SpinVisual = {
  rotorDeg: number
  ballDeg: number
  spinning: boolean
  progress: number
}

type Opts = {
  reducedMotion?: boolean
  onComplete?: (winningNumber: number) => void
}

/**
 * Rotor clockwise, ball counter-clockwise.
 * Pointer is fixed at top (0°). Final rotor places winning pocket under the pointer;
 * ball ends at the same world angle (top).
 */
export function useRouletteAnimation({ reducedMotion = false, onComplete }: Opts = {}) {
  const [visual, setVisual] = useState<SpinVisual>({
    rotorDeg: 0,
    ballDeg: 0,
    spinning: false,
    progress: 0,
  })
  const visualRef = useRef(visual)
  visualRef.current = visual

  const rafRef = useRef<number | null>(null)
  const runningRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const cancel = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    runningRef.current = false
  }, [])

  useEffect(() => () => cancel(), [cancel])

  const spinTo = useCallback(
    (winningNumber: number, durationMs = SPIN_DURATION_MS) => {
      if (runningRef.current) return false
      runningRef.current = true

      const duration = reducedMotion ? Math.min(durationMs, 1600) : durationMs
      const landing = computeSpinLanding(winningNumber, {
        // Keep 3–4 complete rotor revolutions visibly in every normal spin.
        wheelTurns: reducedMotion ? 1 : 3 + Math.floor(Math.random() * 2),
        ballTurns: reducedMotion ? 2 : 6 + Math.floor(Math.random() * 2),
      })

      const startRotor = visualRef.current.rotorDeg
      const startBall = visualRef.current.ballDeg

      // Target rotor: winning pocket under pointer (top)
      const rotorModTarget = normalizeAngle(landing.rotorFinal)
      const rotorDelta = normalizeAngle(rotorModTarget - normalizeAngle(startRotor)) + landing.wheelTurns * 360

      // Ball ends at top (0°). Travel counter-clockwise (negative) many turns.
      const ballEnd = 0
      const ballDelta = ballEnd - normalizeAngle(startBall) - landing.ballTurns * 360

      const t0 = performance.now()

      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / duration)
        const wheelT = easeOutCubic(t)
        const ballT = easeOutQuint(t)
        const bounce = reducedMotion ? 0 : ballBounceOffset(t)

        const rotorDeg = startRotor + rotorDelta * wheelT
        const ballDeg = startBall + ballDelta * ballT + bounce

        setVisual({
          rotorDeg,
          ballDeg,
          spinning: t < 1,
          progress: t,
        })

        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          const finalRotor = startRotor + rotorDelta
          setVisual({
            rotorDeg: finalRotor,
            ballDeg: ballEnd,
            spinning: false,
            progress: 1,
          })
          runningRef.current = false
          rafRef.current = null
          onCompleteRef.current?.(winningNumber)
        }
      }

      rafRef.current = requestAnimationFrame(tick)
      return true
    },
    [reducedMotion],
  )

  return { visual, spinTo, cancel, setVisual, isSpinning: () => runningRef.current }
}
