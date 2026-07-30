import { ASSET, TOTAL_RETURN, type BetSelection, type ChipValue } from '../constants/gameConfig'
import { SCENE } from '../constants/assetManifest'
import type { ZoneAggregate } from '../utils/payoutCalculator'
import type { ReactNode } from 'react'
import styles from './BettingTable.module.css'

type ChipStack = { id: string; value: number; x: number; y: number; mine?: boolean }

type Props = {
  byZone: Map<BetSelection, ZoneAggregate>
  botByZone: Map<BetSelection, ZoneAggregate>
  chipStacks: ChipStack[]
  disabled: boolean
  winner: BetSelection | null
  showOutcome: boolean
  poolDragon: number
  poolTiger: number
  poolTie: number
  trendPct: { dragon: number; tiger: number }
  onPlace: (selection: BetSelection) => void
}

function Zone({
  selection,
  label,
  amount,
  pool,
  disabled,
  winning,
  losing,
  onPlace,
  children,
}: {
  selection: BetSelection
  label: string
  amount: number
  pool: number
  disabled: boolean
  winning: boolean
  losing: boolean
  onPlace: (s: BetSelection) => void
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      className={`${styles.zone} ${styles[selection]} ${winning ? styles.winning : ''} ${losing ? styles.losing : ''}`}
      data-bet={selection}
      disabled={disabled}
      onClick={() => onPlace(selection)}
      aria-label={`Bet ${label}`}
    >
      <span className={styles.pool}>{pool.toLocaleString()}</span>
      <span className={styles.zoneTitle}>{label}</span>
      <span className={styles.odds}>×{TOTAL_RETURN[selection]}</span>
      {amount > 0 && <span className={styles.myBet}>{amount.toLocaleString()}</span>}
      <span className={styles.chipLayer}>{children}</span>
      <span className={styles.flash} aria-hidden />
    </button>
  )
}

/** One carved lacquered table — zones are felt insets, not separate cards. */
export default function BettingTable({
  byZone,
  botByZone,
  chipStacks,
  disabled,
  winner,
  showOutcome,
  poolDragon,
  poolTiger,
  poolTie,
  trendPct,
  onPlace,
}: Props) {
  const stacksFor = (sel: BetSelection) => chipStacks.filter((c) => c.id.startsWith(sel))

  return (
    <div className={styles.table}>
      <div className={styles.wood}>
        <img className={`${styles.corner} ${styles.tl}`} src={SCENE.corner} alt="" draggable={false} />
        <img className={`${styles.corner} ${styles.tr}`} src={SCENE.corner} alt="" draggable={false} />
        <img className={`${styles.corner} ${styles.bl}`} src={SCENE.corner} alt="" draggable={false} />
        <img className={`${styles.corner} ${styles.br}`} src={SCENE.corner} alt="" draggable={false} />
        <div className={styles.goldRail} />
        <div className={styles.felt} style={{ backgroundImage: `url(${SCENE.felt})` }}>
          <div className={styles.zones}>
            <Zone
              selection="dragon"
              label="Dragon"
              amount={byZone.get('dragon')?.amount ?? 0}
              pool={poolDragon}
              disabled={disabled}
              winning={showOutcome && winner === 'dragon'}
              losing={showOutcome && winner !== null && winner !== 'dragon'}
              onPlace={onPlace}
            >
              {stacksFor('dragon')
                .slice(-12)
                .map((c) => (
                  <img
                    key={c.id}
                    className={styles.placed}
                    src={ASSET.chip(c.value as ChipValue, true)}
                    alt=""
                    style={{ left: `${c.x}%`, top: `${c.y}%` }}
                    draggable={false}
                  />
                ))}
            </Zone>

            <div className={styles.divider} aria-hidden />

            <Zone
              selection="tie"
              label="Tie"
              amount={byZone.get('tie')?.amount ?? 0}
              pool={poolTie}
              disabled={disabled}
              winning={showOutcome && winner === 'tie'}
              losing={showOutcome && winner !== null && winner !== 'tie'}
              onPlace={onPlace}
            >
              {stacksFor('tie')
                .slice(-8)
                .map((c) => (
                  <img
                    key={c.id}
                    className={styles.placed}
                    src={ASSET.chip(c.value as ChipValue, true)}
                    alt=""
                    style={{ left: `${c.x}%`, top: `${c.y}%` }}
                    draggable={false}
                  />
                ))}
              <div className={styles.trendBar} aria-hidden>
                <span className={styles.trendLabel}>Last 20</span>
                <div className={styles.trendTrack}>
                  <div className={styles.trendDragon} style={{ width: `${trendPct.dragon}%` }} />
                  <div className={styles.trendTiger} style={{ width: `${trendPct.tiger}%` }} />
                </div>
                <div className={styles.trendPct}>
                  <span>{trendPct.dragon}%</span>
                  <span>{trendPct.tiger}%</span>
                </div>
              </div>
            </Zone>

            <div className={styles.divider} aria-hidden />

            <Zone
              selection="tiger"
              label="Tiger"
              amount={byZone.get('tiger')?.amount ?? 0}
              pool={poolTiger}
              disabled={disabled}
              winning={showOutcome && winner === 'tiger'}
              losing={showOutcome && winner !== null && winner !== 'tiger'}
              onPlace={onPlace}
            >
              {stacksFor('tiger')
                .slice(-12)
                .map((c) => (
                  <img
                    key={c.id}
                    className={styles.placed}
                    src={ASSET.chip(c.value as ChipValue, true)}
                    alt=""
                    style={{ left: `${c.x}%`, top: `${c.y}%` }}
                    draggable={false}
                  />
                ))}
            </Zone>
          </div>
        </div>
      </div>
      <span className={styles.srOnly}>
        bots {botByZone.get('dragon')?.amount ?? 0}/{botByZone.get('tiger')?.amount ?? 0}
      </span>
    </div>
  )
}
