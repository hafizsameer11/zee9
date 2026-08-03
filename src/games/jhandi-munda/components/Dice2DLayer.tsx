import type { JhandiSymbol } from '../../engines/dice'
import { diceFace } from '../assets'
import styles from '../jhandiMunda.module.css'

export type DieState = {
  id: string
  symbol: JhandiSymbol
  x: number
  y: number
  rot: number
  delay: number
  settled: boolean
}

type Props = {
  dice: DieState[]
  visible: boolean
}

export default function Dice2DLayer({ dice, visible }: Props) {
  if (!visible || dice.length === 0) return null

  return (
    <div className={styles.diceLayer}>
      {dice.map((d) => (
        <img
          key={d.id}
          src={diceFace(d.symbol)}
          alt=""
          draggable={false}
          className={`${styles.tableDie} ${d.settled ? styles.tableDieSettled : styles.tableDieFly}`}
          style={
            {
              left: d.x,
              top: d.y,
              '--rot': `${d.rot}deg`,
              '--delay': `${d.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
