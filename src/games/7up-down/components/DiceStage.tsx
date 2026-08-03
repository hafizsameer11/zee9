import { memo, useEffect, useState } from 'react'
import type { UpDownChoice } from '../../engines/dice'
import { diceFace, IMG } from '../assets'
import { formatAmount } from '../chips'
import styles from '../sevenUpDown.module.css'

export type DicePhase = 'idle' | 'rolling' | 'reveal'

type Props = {
  phase: DicePhase
  die1: number | null
  die2: number | null
  sum: number | null
  winningZone: UpDownChoice | null
  payout: number
  staked: number
}

const SIDE_LABEL: Record<UpDownChoice, string> = {
  down: 'DOWN',
  seven: 'LUCKY 7',
  up: 'UP',
}

/** Cycles face values while the cup is shaking. */
function useTumble(active: boolean) {
  const [faces, setFaces] = useState<[number, number]>([1, 1])
  useEffect(() => {
    if (!active) return
    const t = window.setInterval(() => {
      setFaces([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)])
    }, 90)
    return () => window.clearInterval(t)
  }, [active])
  return faces
}

function DiceStage({ phase, die1, die2, sum, winningZone, payout, staked }: Props) {
  const tumbling = phase === 'rolling'
  const [t1, t2] = useTumble(tumbling)

  if (phase === 'idle') return null

  const won = payout > 0
  const showDice = phase === 'reveal' && die1 != null && die2 != null

  return (
    <div className={styles.diceLayer}>
      <div className={styles.diceBackdrop} />
      <div className={styles.diceBox}>
        {tumbling ? (
          <>
            <img src={IMG.cup} alt="" className={styles.cup} draggable={false} />
            <div className={styles.diceRow}>
              <img src={diceFace(t1)} alt="" className={`${styles.die} ${styles.dieTumble}`} draggable={false} />
              <img src={diceFace(t2)} alt="" className={`${styles.die} ${styles.dieTumble}`} draggable={false} />
            </div>
            <span className={styles.phaseLabel}>ROLLING…</span>
          </>
        ) : (
          <>
            {showDice && (
              <div className={styles.diceRow}>
                <img
                  src={diceFace(die1!, sum === 7)}
                  alt={`Die ${die1}`}
                  className={`${styles.die} ${styles.dieLand}`}
                  draggable={false}
                />
                <img
                  src={diceFace(die2!, sum === 7)}
                  alt={`Die ${die2}`}
                  className={`${styles.die} ${styles.dieLand}`}
                  draggable={false}
                />
              </div>
            )}
            {sum != null && (
              <span className={styles.sumBadge}>
                <span className={styles.sumNum}>{sum}</span>
                {winningZone && <span className={styles.sumSide}>{SIDE_LABEL[winningZone]}</span>}
              </span>
            )}
            {staked > 0 && (
              <span className={`${styles.outcome} ${won ? styles.outcomeWin : styles.outcomeLose}`}>
                {won ? `YOU WIN  +${formatAmount(payout)}` : `−${formatAmount(staked)}`}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default memo(DiceStage)
