import S9AssetIcon from './S9AssetIcon'
import { useConfig } from '../../api/hooks'
import styles from './S9EngagementStrip.module.css'

type Props = {
  onWheel: () => void
  onDepositWheel: () => void
  onCashback: () => void
  onDailyBonus: () => void
}

export default function S9EngagementStrip({ onWheel, onDepositWheel, onCashback, onDailyBonus }: Props) {
  const config = useConfig()
  const day1 = config?.bonuses.dailyRewards?.[0] ?? config?.bonuses.dailyOpen ?? 4
  return (
    <div className={styles.strip}>
      <button type="button" className={styles.card} onClick={onWheel}>
        <S9AssetIcon name="wheel" size={36} />
        <span className={styles.label}>Lucky Wheel</span>
      </button>
      <button type="button" className={styles.card} onClick={onDepositWheel}>
        <S9AssetIcon name="betWheel" size={36} />
        <span className={styles.label}>Deposit Wheel</span>
      </button>
      <button type="button" className={styles.card} onClick={onCashback}>
        <S9AssetIcon name="recharge" size={36} />
        <span className={styles.label}>Free Cash</span>
      </button>
      <button type="button" className={styles.card} onClick={onDailyBonus}>
        <span className={styles.emoji}>🎁</span>
        <span className={styles.label}>Daily Rs {day1}</span>
      </button>
    </div>
  )
}
