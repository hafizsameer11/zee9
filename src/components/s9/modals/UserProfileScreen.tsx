import styles from './UserProfileScreen.module.css'

type Props = {
  onClose?: () => void
  onDeposit?: () => void
  onWithdraw?: () => void
}

const USERNAME = 'P9703040'
const USER_ID = '9703040'

const ACTIONS = [
  { key: 'deposit', label: 'Deposit', icon: '↓', color: 'green' },
  { key: 'withdraw', label: 'Withdraw', icon: '↑', color: 'red' },
  { key: 'history', label: 'Transaction History', icon: '☰', color: 'gold' },
  { key: 'bank', label: 'Bank Details', icon: '🏛', color: 'gold' },
] as const

export default function UserProfileScreen({ onDeposit, onWithdraw }: Props) {
  const handleAction = (key: string) => {
    if (key === 'deposit') onDeposit?.()
    if (key === 'withdraw') onWithdraw?.()
  }

  return (
    <div className={styles.panel}>
      <section className={styles.identityCard}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatarRing}>
            <img src="/logo.png" alt="" className={styles.avatar} />
          </div>
        </div>
        <div className={styles.identityInfo}>
          <h2 className={styles.name}>{USERNAME}</h2>
          <p className={styles.id}>ID: {USER_ID}</p>
        </div>
        <button type="button" className={styles.vipBtn}>
          <span className={styles.vipCrown} aria-hidden>👑</span>
          VIP
        </button>
      </section>

      <div className={styles.balances}>
        <div className={styles.balanceCard}>
          <div className={styles.balanceIcon}>🪙</div>
          <div>
            <p className={styles.balanceLabel}>Main Balance</p>
            <p className={styles.balanceValue}>0.00 <small>PKR</small></p>
          </div>
        </div>
        <div className={styles.balanceCard}>
          <div className={styles.balanceIcon}>🎁</div>
          <div>
            <p className={styles.balanceLabel}>Bonus Balance</p>
            <p className={styles.balanceValue}>0.00 <small>PKR</small></p>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        {ACTIONS.map((action) => (
          <button
            key={action.key}
            type="button"
            className={styles.actionBtn}
            onClick={() => handleAction(action.key)}
          >
            <span className={`${styles.actionIcon} ${styles[`icon${action.color}`]}`}>
              {action.icon}
            </span>
            <span className={styles.actionLabel}>{action.label}</span>
          </button>
        ))}
      </div>

      <section className={styles.betsSection}>
        <header className={styles.betsHead}>
          <span className={styles.betsIcon} aria-hidden>🕐</span>
          <h3>My Bets</h3>
        </header>
        <div className={styles.betsEmpty}>
          <span>📋</span>
          <p>No bets yet</p>
          <small>Your recent game bets will appear here</small>
        </div>
      </section>
    </div>
  )
}
