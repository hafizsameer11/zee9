import { useEffect, useRef, useState } from 'react'
import { MULTIPLIER_TRACK } from '../constants/gameConfig'
import { MULT_POSITIONS } from '../constants/layoutConfig'
import styles from '../styles/stage.module.css'

type Props = {
  multIndex: number
  reducedMotion?: boolean
}

export default function MultiplierTrack({ multIndex, reducedMotion }: Props) {
  const prev = useRef(multIndex)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (prev.current !== multIndex) {
      prev.current = multIndex
      if (!reducedMotion) {
        setPulse(true)
        const t = window.setTimeout(() => setPulse(false), 650)
        return () => window.clearTimeout(t)
      }
    }
  }, [multIndex, reducedMotion])

  const start = Math.max(0, Math.min(multIndex - 2, MULTIPLIER_TRACK.length - 5))

  return (
    <>
      {MULTIPLIER_TRACK.slice(start, start + 5).map((m, vi) => {
        const abs = start + vi
        const active = abs === multIndex
        const cx = MULT_POSITIONS[vi] ?? MULT_POSITIONS[2]
        return (
          <span
            key={`${m}-${abs}`}
            className={`${styles.multChip} ${active ? styles.multChipOn : ''} ${
              active ? styles.multChipCenter : ''
            } ${pulse && active ? styles.multChipPulse : ''}`}
            style={{ left: cx, transform: 'translateX(-50%)' }}
          >
            {active && <span className={styles.multChipGlow} aria-hidden />}
            x{m}
          </span>
        )
      })}
    </>
  )
}
