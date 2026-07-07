import { DEMO_BALANCE, CURRENCY } from '../data/games'
import styles from './Wallet.module.css'

const TRANSACTIONS = [
  { id: 1, type: 'deposit', amount: 1000, method: 'JazzCash', date: 'Today, 2:30 PM', status: 'completed' },
  { id: 2, type: 'win', amount: 250, method: 'Dragon Tiger', date: 'Today, 1:15 PM', status: 'completed' },
  { id: 3, type: 'withdraw', amount: -500, method: 'Easypaisa', date: 'Yesterday', status: 'pending' },
  { id: 4, type: 'deposit', amount: 500, method: 'JazzCash', date: 'Jun 15', status: 'completed' },
]

export default function Wallet() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>💰 Wallet</h1>
      </header>

      <div className={styles.balanceCard}>
        <p className={styles.balanceLabel}>Available Balance</p>
        <p className={styles.balanceAmount}>
          <span className={styles.currency}>{CURRENCY}</span>
          {DEMO_BALANCE.toFixed(2)}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.depositBtn}>
            <span className={styles.btnIcon}>+</span>
            Deposit
          </button>
          <button type="button" className={styles.withdrawBtn}>
            <span className={styles.btnIcon}>−</span>
            Withdraw
          </button>
        </div>
      </div>

      <div className={styles.methods}>
        <h2 className={styles.sectionTitle}>Payment Methods</h2>
        <div className={styles.methodRow}>
          <div className={styles.method}>
            <span className={styles.methodEmoji}>📱</span>
            <span>JazzCash</span>
          </div>
          <div className={styles.method}>
            <span className={styles.methodEmoji}>💳</span>
            <span>Easypaisa</span>
          </div>
          <div className={styles.method}>
            <span className={styles.methodEmoji}>🏦</span>
            <span>Bank</span>
          </div>
        </div>
      </div>

      <div className={styles.history}>
        <h2 className={styles.sectionTitle}>Recent Transactions</h2>
        <ul className={styles.txList}>
          {TRANSACTIONS.map((tx) => (
            <li key={tx.id} className={styles.txItem}>
              <div className={styles.txLeft}>
                <span className={styles.txIcon}>
                  {tx.type === 'deposit' ? '↓' : tx.type === 'withdraw' ? '↑' : '🏆'}
                </span>
                <div>
                  <p className={styles.txMethod}>{tx.method}</p>
                  <p className={styles.txDate}>{tx.date}</p>
                </div>
              </div>
              <div className={styles.txRight}>
                <p className={`${styles.txAmount} ${tx.amount > 0 ? styles.positive : styles.negative}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} PKR
                </p>
                <span className={`${styles.txStatus} ${styles[tx.status]}`}>{tx.status}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
