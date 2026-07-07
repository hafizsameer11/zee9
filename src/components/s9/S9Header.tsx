import { useWallet } from '../../context/WalletContext'
import { DEMO_PLAYER, formatS9Amount } from '../../data/s9Games'
import { IconMail, IconSettings } from './S9Icons'
import S9AssetIcon from './S9AssetIcon'
import styles from './S9Header.module.css'

type Props = {
  onDeposit: () => void
  onProfile: () => void
  onDailyBonus: () => void
  onMail: () => void
  onSettings: () => void
  mailUnread?: boolean
}

function formatNum(n: number) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export default function S9Header({
  onDeposit,
  onProfile,
  onDailyBonus,
  onMail,
  onSettings,
  mailUnread = true,
}: Props) {
  const { balance } = useWallet()
  const vipPct = Math.min(100, (DEMO_PLAYER.vipProgress / DEMO_PLAYER.vipTarget) * 100)

  return (
    <header className={styles.header}>
      <button type="button" className={styles.profileBtn} onClick={onProfile}>
        <div className={styles.avatar}>
          <span className={styles.avatarRing} aria-hidden />
          <img src="/logo.png" alt="Profile" className={styles.logo} />
          <span className={styles.level}>{DEMO_PLAYER.vipLevel}</span>
        </div>
        <div className={styles.playerMeta}>
          <span className={styles.playerName}>{DEMO_PLAYER.name}</span>
          <span className={styles.vipBadge}>VIP {DEMO_PLAYER.vipLevel}</span>
          <div className={styles.vipBar}>
            <div className={styles.vipFill} style={{ width: `${vipPct}%` }} />
          </div>
          <span className={styles.vipText}>
            {formatNum(DEMO_PLAYER.vipProgress)}/{formatNum(DEMO_PLAYER.vipTarget)}
          </span>
        </div>
      </button>

      <div className={styles.balanceBox}>
        <S9AssetIcon name="coin" size={22} className={styles.balanceCoin} />
        <span className={styles.balance}>{formatS9Amount(balance)}</span>
        <button type="button" className={styles.plusBtn} onClick={onDeposit} aria-label="Add funds">
          +
        </button>
      </div>

      <button type="button" className={styles.dailyBonus} onClick={onDailyBonus}>
        <span className={styles.hotBadge}>HOT</span>
        <S9AssetIcon name="gift" size={38} />
        <span className={styles.dailyBonusLabel}>Daily Bonus</span>
      </button>

      <div className={styles.right}>
        <button type="button" className={styles.actionBtn} onClick={onMail}>
          <span className={styles.actionCircle}>
            <IconMail size={15} />
            {mailUnread && <span className={styles.dot} />}
          </span>
        </button>
        <button type="button" className={styles.actionBtn} onClick={onSettings}>
          <span className={styles.actionCircle}>
            <IconSettings size={15} />
          </span>
        </button>
      </div>
    </header>
  )
}
