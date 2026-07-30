import Zee9LoadingScreen from '../../../components/Zee9LoadingScreen'
import { colorOfNumber } from '../utils/rouletteNumbers'
import styles from '../styles/roulette.module.css'

type Props = {
  progress: number
}

export default function RouletteLoadingScreen({ progress }: Props) {
  return (
    <Zee9LoadingScreen
      progress={progress}
      title="Roulette"
      subtitle="Preparing table…"
      fullScreen
    />
  )
}

export function WinningOverlay({
  number,
  payout,
  show,
}: {
  number: number | null
  payout: number
  show: boolean
}) {
  if (!show || number == null) return null
  const color = colorOfNumber(number)
  return (
    <div className={styles.winOverlay} role="status">
      <div className={styles.winBadge}>
        <div
          className={styles.winNum}
          style={{
            color: color === 'red' ? '#ff6b6b' : color === 'green' ? '#5ddea0' : '#f0f0f0',
          }}
        >
          {number}
        </div>
        <div className={styles.winLabel}>{color}</div>
        {payout > 0 && <div className={styles.winPayout}>+{payout.toFixed(2)}</div>}
      </div>
    </div>
  )
}
