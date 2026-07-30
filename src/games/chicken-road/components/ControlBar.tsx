import styles from './ControlBar.module.css'
import {
  BAR_QUICK_BETS,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  formatMoney,
  type DifficultyId,
} from '../constants/gameConfig'

type Props = {
  betAmount: number
  balance: number
  difficulty: DifficultyId
  canEditBet: boolean
  canStart: boolean
  canMove: boolean
  canCashOut: boolean
  potentialPayout: number
  roundActive: boolean
  onBetChange: (value: number) => void
  onDecrease: () => void
  onIncrease: () => void
  onDifficulty: (difficulty: DifficultyId) => void
  onPlay: () => void
  onMove: () => void
  onCashOut: () => void
}

export default function ControlBar(props: Props) {
  const play = props.roundActive ? props.onMove : props.onPlay
  const playDisabled = props.roundActive ? !props.canMove : !props.canStart
  const options = DIFFICULTY_ORDER

  return (
    <div className={styles.wrap}>
      <div className={styles.panel}>
        <section className={styles.betSection}>
          <label>Bet amount</label>
          <div className={styles.betField}>
            <button
              type="button"
              className={styles.step}
              disabled={!props.canEditBet || props.betAmount <= 10}
              onClick={props.onDecrease}
              aria-label="Decrease bet"
            >−</button>
            <strong>{formatMoney(props.betAmount)} <small>Rs</small></strong>
            <button
              type="button"
              className={styles.step}
              disabled={!props.canEditBet || props.betAmount >= props.balance}
              onClick={props.onIncrease}
              aria-label="Increase bet"
            >+</button>
          </div>
          <div className={styles.quick}>
            {BAR_QUICK_BETS.map((amount) => (
              <button
                type="button"
                key={amount}
                disabled={!props.canEditBet || amount > props.balance}
                onClick={() => props.onBetChange(amount)}
              >{amount}</button>
            ))}
          </div>
        </section>

        <section className={styles.diffSection}>
          <label>Difficulty</label>
          <div className={styles.difficulties}>
            {options.map((id) => (
              <button
                type="button"
                key={id}
                className={id === props.difficulty ? styles.selected : ''}
                disabled={!props.canEditBet}
                onClick={() => props.onDifficulty(id)}
              >
                <img src={DIFFICULTIES[id].icon} alt="" />
                {DIFFICULTIES[id].label}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.actions}>
          <button className={styles.play} type="button" disabled={playDisabled} onClick={play}>
            {props.roundActive ? 'MOVE' : 'PLAY'}
          </button>
          <button
            className={styles.cash}
            type="button"
            disabled={!props.canCashOut}
            onClick={props.onCashOut}
          >
            CASH OUT{props.canCashOut ? ` ${formatMoney(props.potentialPayout)}` : ''}
          </button>
        </section>
      </div>
    </div>
  )
}
