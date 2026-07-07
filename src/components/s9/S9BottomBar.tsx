import S9AssetIcon from './S9AssetIcon'
import S9CalendarIcon from './S9CalendarIcon'
import { IconCart } from './S9Icons'
import styles from './S9BottomBar.module.css'

type Props = {
  onDeposit: () => void
  onWheel: () => void
  onRefer: () => void
  onDailyBonus: () => void
  onBetWheel: () => void
  onRecharge: () => void
  onCashback: () => void
}

const FEATURES = [
  { key: 'wheel' as const, label: 'Wheel', icon: <S9AssetIcon name="wheel" size={44} />, anim: 'wheel' },
  { key: 'daily' as const, label: 'Daily Bonus', icon: <S9CalendarIcon day="07" size={44} />, anim: 'daily' },
  { key: 'betWheel' as const, label: 'Bet Bonus', icon: <S9AssetIcon name="betWheel" size={44} />, anim: 'betWheel' },
  { key: 'recharge' as const, label: 'Recharge', icon: <S9AssetIcon name="recharge" size={44} />, dot: true, anim: 'recharge' },
  { key: 'cashback' as const, label: 'Cashback', icon: <S9CalendarIcon day="30" size={44} />, anim: 'cashback' },
]

export default function S9BottomBar({
  onDeposit,
  onWheel,
  onRefer,
  onDailyBonus,
  onBetWheel,
  onRecharge,
  onCashback,
}: Props) {
  const handlers = {
    wheel: onWheel,
    daily: onDailyBonus,
    betWheel: onBetWheel,
    recharge: onRecharge,
    cashback: onCashback,
  }

  return (
    <footer className={styles.bar}>
      <button type="button" className={styles.refer} onClick={onRefer}>
        <S9AssetIcon name="referShare" size={20} />
        <span>Refer &amp; Earn</span>
        <span className={styles.referGlow} aria-hidden />
      </button>

      <div className={styles.features}>
        {FEATURES.map(({ key, label, icon, dot, anim }) => (
          <button key={key} type="button" className={styles.feature} onClick={handlers[key]}>
            <span className={styles.iconWrap}>
              <span className={`${styles.featureArt} ${styles[`anim_${anim}`]}`}>{icon}</span>
              {dot && <span className={styles.featureDot}>1</span>}
            </span>
            <span className={styles.featureLabel}>{label}</span>
          </button>
        ))}
      </div>

      <button type="button" className={styles.addCash} onClick={onDeposit}>
        <span className={styles.addCashShine} aria-hidden />
        <span className={styles.addPlus}>+</span>
        <IconCart size={20} />
        <span className={styles.addCashText}>ADD CASH</span>
        <span className={styles.cashDot}>1</span>
      </button>
    </footer>
  )
}
