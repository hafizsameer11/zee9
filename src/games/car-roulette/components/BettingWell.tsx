import {
  ASSET,
  BETTING_SECONDS,
  BRAND_BY_ID,
  ZONE_GRID,
  type BrandId,
} from '../constants/gameConfig'
import styles from '../styles/carRoulette.module.css'

type ChipStack = { id: string; brand: BrandId; value: number; x: number; y: number; mine?: boolean }

type Props = {
  countdown: number
  warning: boolean
  spinning?: boolean
  statusText: string
  bettingOpen: boolean
  bets: Map<BrandId, number>
  pools: Map<BrandId, number>
  stacks: ChipStack[]
  winner: BrandId | null
  showOutcome: boolean
  onPlace: (brand: BrandId) => void
}

function formatPool(n: number) {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  return n.toLocaleString()
}

export default function BettingWell({
  countdown,
  warning,
  spinning,
  statusText,
  bettingOpen,
  bets,
  pools,
  stacks,
  winner,
  showOutcome,
  onPlace,
}: Props) {
  const pct = spinning
    ? 100
    : Math.max(0, Math.min(100, (countdown / BETTING_SECONDS) * 100))
  const ring = spinning
    ? '#ffd24a'
    : warning
      ? countdown <= 1
        ? '#ff3b2f'
        : '#ffb02e'
      : '#4ad0ff'

  return (
    <div className={styles.well} style={{ inset: 0 }}>
      {ZONE_GRID.map((id) => {
        if (!id) {
          return (
            <div key="timer" className={styles.timerSlot}>
              <div className={`${styles.timer} ${warning ? styles.timerWarn : ''}`}>
                <img className={styles.timerBezel} src={ASSET.ui('timer-bezel')} alt="" draggable={false} />
                <div
                  className={styles.timerRing}
                  style={{ ['--pct' as string]: pct, ['--ring' as string]: ring }}
                />
                <div className={styles.timerNum}>{spinning ? 'GO' : countdown}</div>
                <div className={styles.timerLabel}>{statusText}</div>
              </div>
            </div>
          )
        }
        const brand = BRAND_BY_ID.get(id)!
        const mine = bets.get(id) ?? 0
        const pool = (pools.get(id) ?? 0) + mine
        const isWin = showOutcome && winner === id
        const isDim = showOutcome && winner != null && winner !== id
        const rare = brand.mult >= 15
        const jackpot = brand.mult >= 30
        return (
          <button
            key={id}
            type="button"
            className={[
              styles.zone,
              rare ? styles.zoneRare : '',
              jackpot ? styles.zoneJackpot : '',
              isWin ? styles.zoneWinner : '',
              isDim ? styles.zoneDim : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-bet={id}
            disabled={!bettingOpen}
            onClick={() => onPlace(id)}
            aria-label={`Bet ${brand.name} x${brand.mult}`}
          >
            <img className={styles.zoneEmblem} src={ASSET.emblem(id)} alt="" draggable={false} />
            <span className={styles.zoneMult}>x{brand.mult}</span>
            <span className={styles.zoneName}>{brand.name}</span>
            {pool > 0 && <span className={styles.zonePool}>{formatPool(pool)}</span>}
            {mine > 0 && <span className={styles.zoneMine}>{mine.toLocaleString()}</span>}
            {stacks
              .filter((s) => s.brand === id)
              .map((s) => (
                <img
                  key={s.id}
                  className={`${styles.chipStack} ${s.mine ? styles.chipStackMine : ''}`}
                  src={ASSET.chip(s.value, true)}
                  alt=""
                  draggable={false}
                  style={{
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    transform: `rotate(${((s.id.charCodeAt(0) % 7) - 3) * 4}deg)`,
                  }}
                />
              ))}
          </button>
        )
      })}
    </div>
  )
}
