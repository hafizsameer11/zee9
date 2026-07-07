import { useNavigate } from 'react-router-dom'
import styles from './LuckySpinBanner.module.css'

export default function LuckySpinBanner() {
  const navigate = useNavigate()

  return (
    <button type="button" className={styles.banner} onClick={() => navigate('/promotions')}>
      <div className={styles.wheel} aria-hidden="true">🎡</div>
      <div className={styles.text}>
        <p className={styles.title}>🎰 Lucky Spin — Win Big!</p>
        <p className={styles.sub}>Deposit 1,000+ PKR to unlock free spin</p>
      </div>
      <span className={styles.arrow}>›</span>
    </button>
  )
}
