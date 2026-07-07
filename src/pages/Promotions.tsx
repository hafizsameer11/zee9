import { PROMOTIONS } from '../data/games'
import styles from './Promotions.module.css'

export default function Promotions() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>🎁 Promotions</h1>
        <p className={styles.subtitle}>Exclusive offers & rewards</p>
      </header>

      <div className={styles.spinCard}>
        <div className={styles.wheel} aria-hidden="true">
          <div className={styles.wheelInner}>🎡</div>
        </div>
        <div className={styles.spinInfo}>
          <h2>Lucky Spin</h2>
          <p>Deposit 1,000+ PKR to unlock your free spin!</p>
          <button type="button" className={styles.spinBtn}>Spin Now</button>
        </div>
      </div>

      <div className={styles.list}>
        {PROMOTIONS.map((promo) => (
          <div key={promo.id} className={styles.card}>
            <span className={styles.tag}>{promo.tag}</span>
            <h3 className={styles.cardTitle}>{promo.title}</h3>
            <p className={styles.cardDesc}>{promo.desc}</p>
            <button type="button" className={styles.claimBtn}>Claim</button>
          </div>
        ))}
      </div>

      <div className={styles.referral}>
        <h2 className={styles.refTitle}>Your Referral Code</h2>
        <div className={styles.refCode}>
          <span>ZEE9-DEMO2026</span>
          <button type="button" className={styles.copyBtn}>Copy</button>
        </div>
        <p className={styles.refHint}>Share with friends & earn 20% commission on their deposits</p>
      </div>
    </div>
  )
}
