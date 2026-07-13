import { useEffect, useState } from 'react'
import { api } from '../../../api/client'
import { useWallet } from '../../../context/WalletContext'
import { usePlayerAuth } from '../../../api/auth'
import styles from './UserProfileScreen.module.css'

type Props = {
  onClose?: () => void
  onDeposit?: () => void
  onWithdraw?: () => void
  onHistory?: () => void
}

type Bet = { id: string; game: string; bet: number; payout: number; state: string; multiplier: number; time: string }

const ACTIONS = [
  { key: 'deposit', label: 'Deposit', icon: '↓', color: 'green' },
  { key: 'withdraw', label: 'Withdraw', icon: '↑', color: 'red' },
  { key: 'history', label: 'Transaction History', icon: '☰', color: 'gold' },
  { key: 'bank', label: 'Bank Details', icon: '🏛', color: 'gold' },
] as const

export default function UserProfileScreen({ onDeposit, onWithdraw, onHistory }: Props) {
  const { balance, bonus } = useWallet()
  const { player } = usePlayerAuth()
  const [bets, setBets] = useState<Bet[]>([])

  useEffect(() => {
    api.get('/me/bets').then(setBets).catch(() => {})
  }, [])

  const handleAction = (key: string) => {
    if (key === 'deposit') onDeposit?.()
    if (key === 'withdraw') onWithdraw?.()
    if (key === 'history') onHistory?.()
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
          <h2 className={styles.name}>{player?.name ?? '—'}</h2>
          <p className={styles.id}>ID: {player?.id?.slice(-8) ?? '—'}</p>
          {player?.referralCode && <p className={styles.id}>Ref: {player.referralCode}</p>}
        </div>
        <button type="button" className={styles.vipBtn}>
          <span className={styles.vipCrown} aria-hidden>👑</span>
          VIP {player?.vipLevel ?? 1}
        </button>
      </section>

      <div className={styles.balances}>
        <div className={styles.balanceCard}>
          <div className={styles.balanceIcon}>🪙</div>
          <div>
            <p className={styles.balanceLabel}>Main Balance</p>
            <p className={styles.balanceValue}>{balance.toFixed(2)} <small>PKR</small></p>
          </div>
        </div>
        <div className={styles.balanceCard}>
          <div className={styles.balanceIcon}>🎁</div>
          <div>
            <p className={styles.balanceLabel}>Bonus Balance</p>
            <p className={styles.balanceValue}>{bonus.toFixed(2)} <small>PKR</small></p>
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
        {bets.length === 0 ? (
          <div className={styles.betsEmpty}>
            <span>📋</span>
            <p>No bets yet</p>
            <small>Your recent game bets will appear here</small>
          </div>
        ) : (
          <div style={{ padding: '8px 12px' }}>
            {bets.map((b) => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(139,105,20,.15)', fontSize: 12, color: '#e8d0a0' }}>
                <span>{b.game} · Rs {b.bet}</span>
                <span style={{ color: b.payout > b.bet ? '#8bd98b' : '#ef9a9a' }}>
                  {b.state === 'BUST' ? 'Lost' : `+Rs ${b.payout}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
