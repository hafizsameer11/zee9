import { IconMegaphone } from './S9Icons'
import { TICKER_MESSAGES } from '../../data/s9Games'
import styles from './S9Ticker.module.css'

export default function S9Ticker() {
  return (
    <div className={styles.ticker}>
      <span className={styles.icon} aria-hidden>
        <IconMegaphone size={14} />
      </span>
      <div className={styles.track}>
        <p className={styles.text}>{TICKER_MESSAGES}</p>
      </div>
    </div>
  )
}
