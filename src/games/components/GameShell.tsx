import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { sound } from '../../lib/sound'
import styles from './gameShell.module.css'

type Props = {
  title: string
  children: React.ReactNode
  sidebar?: React.ReactNode
  message?: string | null
}

export default function GameShell({ title, children, sidebar, message }: Props) {
  const navigate = useNavigate()
  const { balance } = useWallet()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.back}
          data-sfx="whoosh"
          onClick={() => {
            sound.play('whoosh')
            navigate('/home')
          }}
        >
          ← Lobby
        </button>
        <h1>{title}</h1>
        <span className={styles.balance}>
          <span className={styles.balanceIcon}>🪙</span>
          {balance.toFixed(0)}
        </span>
      </header>

      {message && <div className={styles.toast}>{message}</div>}

      <div className={styles.body}>
        <div className={styles.main}>{children}</div>
        {sidebar}
      </div>
    </div>
  )
}

export function BetSidebar({
  bet,
  setBet,
  onConfirm,
  confirmLabel = 'Confirm',
  disabled,
  multiplier,
}: {
  bet: number
  setBet: (v: number) => void
  onConfirm?: () => void
  confirmLabel?: string
  disabled?: boolean
  multiplier?: number
}) {
  const potential = multiplier ? Math.round(bet * multiplier) : null

  return (
    <aside className={styles.sidebar}>
      <p className={styles.label}>Bet</p>
      <div className={styles.betPanel}>
        <div className={styles.betRow}>
          <button type="button" onClick={() => setBet(Math.max(10, bet - 10))} aria-label="Decrease bet">
            −
          </button>
          <span className={styles.betAmount}>{bet}</span>
          <button type="button" onClick={() => setBet(Math.min(10000, bet + 10))} aria-label="Increase bet">
            +
          </button>
        </div>
        <div className={styles.quick}>
          {[10, 20, 50, 100, 500, 1000, 2000, 5000, 10000].map((v) => (
            <button
              key={v}
              type="button"
              className={bet === v ? styles.quickActive : undefined}
              onClick={() => setBet(v)}
            >
              {v}
            </button>
          ))}
        </div>
        {potential != null && (
          <p className={styles.potentialWin}>
            Win @ {multiplier!.toFixed(2)}x: <strong>{potential} PKR</strong>
          </p>
        )}
      </div>
      {onConfirm && (
        <button type="button" className={styles.confirm} onClick={onConfirm} disabled={disabled}>
          {confirmLabel}
        </button>
      )}
    </aside>
  )
}
