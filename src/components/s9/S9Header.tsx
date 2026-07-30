import { useWallet } from '../../context/WalletContext'
import { usePlayerAuth } from '../../api/auth'
import { useConfig } from '../../api/hooks'
import { formatS9Amount } from '../../data/s9Games'
import { IconMail, IconNews, IconSettings, IconSupport } from './S9Icons'
import S9AssetIcon from './S9AssetIcon'
import styles from './S9Header.module.css'

type Props = {
  onDeposit: () => void
  onProfile: () => void
  onDailyBonus: () => void
  onVip?: () => void
  onMail: () => void
  onSettings: () => void
  onNews?: () => void
  onSupport?: () => void
  onAgent?: () => void
  mailUnread?: boolean
}

const VIP_THRESHOLDS = [0, 1000, 5000, 15000, 40000, 100000, 200000, 350000, 550000, 800000, 1200000, 1800000, 2500000]

function formatNum(n: number) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export default function S9Header({
  onDeposit,
  onProfile,
  onDailyBonus,
  onVip,
  onMail,
  onSettings,
  onNews,
  onSupport,
  onAgent,
  mailUnread = true,
}: Props) {
  const { balance } = useWallet()
  const { player } = usePlayerAuth()
  const config = useConfig()

  const waDigits = config?.whatsapp?.replace(/\D/g, '') ?? ''
  const openWhatsApp = () => {
    if (!waDigits) return
    window.open(`https://wa.me/${waDigits}`, '_blank', 'noopener,noreferrer')
  }

  const vipLevel = player?.vipLevel ?? 0
  const deposited = player?.totalDeposited ?? 0
  const prev = VIP_THRESHOLDS[Math.min(vipLevel, VIP_THRESHOLDS.length - 1)] ?? 0
  const next =
    VIP_THRESHOLDS[Math.min(vipLevel + 1, VIP_THRESHOLDS.length - 1)] ??
    VIP_THRESHOLDS[VIP_THRESHOLDS.length - 1]!
  const vipProgress = Math.max(0, deposited - prev)
  const vipTarget = Math.max(1, next - prev)
  const vipPct = Math.min(100, (vipProgress / vipTarget) * 100)

  return (
    <header className={styles.header}>
      {player?.referralAgentActive && onAgent ? (
        <button type="button" className={styles.agentBtn} onClick={onAgent} data-sfx="tap">
          <span className={styles.agentIcon} aria-hidden>
            👥
          </span>
          <span>Agent</span>
        </button>
      ) : null}
      <button type="button" className={styles.profileBtn} onClick={onProfile}>
        <div className={styles.avatar}>
          <span className={styles.avatarRing} aria-hidden />
          <img src="/logo.png" alt="Profile" className={styles.logo} />
          <span className={styles.level}>{vipLevel}</span>
        </div>
        <div className={styles.playerMeta}>
          <span className={styles.playerName}>{player?.name ?? 'Guest'}</span>
          <span
            className={styles.vipBadge}
            role={onVip ? 'button' : undefined}
            onClick={(e) => {
              if (!onVip) return
              e.stopPropagation()
              onVip()
            }}
          >
            VIP {vipLevel}
          </span>
          <div className={styles.vipBar}>
            <div className={styles.vipFill} style={{ width: `${vipPct}%` }} />
          </div>
          <span className={styles.vipText}>
            {formatNum(vipProgress)}/{formatNum(vipTarget)}
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
        {onSupport && (
          <button type="button" className={styles.actionBtn} onClick={onSupport} title="Support">
            <span className={styles.actionCircle}>
              <IconSupport size={15} />
            </span>
          </button>
        )}
        {onNews && (
          <button type="button" className={styles.actionBtn} onClick={onNews} title="News">
            <span className={styles.actionCircle}>
              <IconNews size={15} />
            </span>
          </button>
        )}
        {config?.whatsapp && !onSupport && (
          <button type="button" className={styles.actionBtn} onClick={openWhatsApp} title="Customer Service">
            <span className={styles.actionCircle} style={{ background: '#25D366', color: '#fff' }}>
              WA
            </span>
          </button>
        )}
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
