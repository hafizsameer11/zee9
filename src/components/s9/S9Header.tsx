import { useWallet } from '../../context/WalletContext'
import { IconChip, IconMail, IconNews, IconSettings, IconSupport, IconWallet } from './S9Icons'
import styles from './S9Header.module.css'

type Props = {
  onDeposit: () => void
  onWithdraw: () => void
  onProfile: () => void
  onNews: () => void
  onSupport: () => void
  onMail: () => void
  onSettings: () => void
  mailUnread?: boolean
}

export default function S9Header({
  onDeposit,
  onWithdraw,
  onProfile,
  onNews,
  onSupport,
  onMail,
  onSettings,
  mailUnread = true,
}: Props) {
  const { balance } = useWallet()
  const actions = [
    { Icon: IconNews, label: 'News', onClick: onNews, dot: false },
    { Icon: IconSupport, label: 'Support', onClick: onSupport, dot: false },
    { Icon: IconMail, label: 'Mail', onClick: onMail, dot: mailUnread },
    { Icon: IconSettings, label: 'Settings', onClick: onSettings, dot: false },
  ]

  return (
    <header className={styles.header}>
      <button type="button" className={styles.left} onClick={onProfile}>
        <div className={styles.avatar}>
          <img src="/logo.png" alt="Zee9" className={styles.logo} />
        </div>
        <div className={styles.user}>
          <span className={styles.name}>P9703040</span>
          <div className={styles.meta}>
            <span className={styles.uid}>ID: 9703040</span>
            <span className={styles.vip}>VIP 0</span>
          </div>
        </div>
      </button>

      <div className={styles.center}>
        <div className={styles.balanceBox}>
          <IconChip size={16} />
          <span className={styles.balance}>{balance.toFixed(0)}</span>
          <button type="button" className={styles.plusBtn} onClick={onDeposit}>+</button>
        </div>
        <button type="button" className={styles.withdraw} onClick={onWithdraw}>
          <IconWallet size={20} />
          <span>Withdraw</span>
        </button>
      </div>

      <div className={styles.right}>
        {actions.map(({ Icon, label, onClick, dot }) => (
          <button key={label} type="button" className={styles.actionBtn} onClick={onClick}>
            <span className={styles.actionCircle}>
              <Icon size={14} />
              {dot && <span className={styles.dot} />}
            </span>
            <span className={styles.actionLabel}>{label}</span>
          </button>
        ))}
      </div>
    </header>
  )
}
