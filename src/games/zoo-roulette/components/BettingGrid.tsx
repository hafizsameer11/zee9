import {
  ANIMAL_BY_ID,
  ASSET,
  BEAST_IDS,
  BIRD_IDS,
  type AnimalId,
  type BetZoneId,
} from '../constants/gameConfig'
import styles from '../styles/zooRoulette.module.css'

type ChipStack = { id: string; zone: BetZoneId; value: number; x: number; y: number; mine?: boolean }

type Props = {
  bettingOpen: boolean
  bets: Map<BetZoneId, number>
  pools: Map<BetZoneId, number>
  stacks: ChipStack[]
  winner: AnimalId | null
  showOutcome: boolean
  onPlace: (zone: BetZoneId) => void
}

function formatPool(n: number) {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  return n.toLocaleString()
}

function zoneWins(zone: BetZoneId, winner: AnimalId | null): boolean {
  if (!winner) return false
  if (zone === winner) return true
  if (zone === 'beast' && BEAST_IDS.includes(winner)) return true
  if (zone === 'bird' && BIRD_IDS.includes(winner)) return true
  return false
}

function ZoneCell({
  zone,
  label,
  mult,
  panel,
  portrait,
  bettingOpen,
  mine,
  pool,
  stacks,
  winner,
  showOutcome,
  onPlace,
  className,
}: {
  zone: BetZoneId
  label: string
  mult: number
  panel?: string
  portrait?: string
  bettingOpen: boolean
  mine: number
  pool: number
  stacks: ChipStack[]
  winner: AnimalId | null
  showOutcome: boolean
  onPlace: (zone: BetZoneId) => void
  className?: string
}) {
  const isWin = showOutcome && zoneWins(zone, winner)
  const isDim = showOutcome && winner != null && !isWin
  return (
    <button
      type="button"
      className={[
        styles.zone,
        className ?? '',
        isWin ? styles.zoneWinner : '',
        isDim ? styles.zoneDim : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-bet={zone}
      disabled={!bettingOpen}
      onClick={() => onPlace(zone)}
      aria-label={`Bet ${label} x${mult}`}
      style={panel ? { backgroundImage: `url(${panel})` } : undefined}
    >
      {portrait && <img className={styles.zonePortrait} src={portrait} alt="" draggable={false} />}
      <span className={styles.zoneMult}>x{mult}</span>
      <span className={styles.zoneName}>{label}</span>
      {pool > 0 && <span className={styles.zonePool}>{formatPool(pool)}</span>}
      {mine > 0 && <span className={styles.zoneMine}>{mine.toLocaleString()}</span>}
      {stacks
        .filter((s) => s.zone === zone)
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
              transform: `rotate(${((s.id.charCodeAt(0) % 7) - 3) * 5}deg)`,
            }}
          />
        ))}
    </button>
  )
}

export default function BettingGrid({
  bettingOpen,
  bets,
  pools,
  stacks,
  winner,
  showOutcome,
  onPlace,
}: Props) {
  const beastAnimals = BEAST_IDS
  const birdAnimals = BIRD_IDS

  return (
    <div className={styles.bettingGrid}>
      {beastAnimals.map((id, i) => {
        const a = ANIMAL_BY_ID.get(id)!
        const mine = bets.get(id) ?? 0
        const pool = (pools.get(id) ?? 0) + mine
        return (
          <ZoneCell
            key={id}
            zone={id}
            label={a.name}
            mult={a.mult}
            portrait={ASSET.animal(id, 'portrait')}
            bettingOpen={bettingOpen}
            mine={mine}
            pool={pool}
            stacks={stacks}
            winner={winner}
            showOutcome={showOutcome}
            onPlace={onPlace}
            className={`${styles.zoneBeast} ${styles[`zoneRow${i + 1}`]}`}
          />
        )
      })}

      {birdAnimals.map((id, i) => {
        const a = ANIMAL_BY_ID.get(id)!
        const mine = bets.get(id) ?? 0
        const pool = (pools.get(id) ?? 0) + mine
        return (
          <ZoneCell
            key={id}
            zone={id}
            label={a.name}
            mult={a.mult}
            portrait={ASSET.animal(id, 'portrait')}
            bettingOpen={bettingOpen}
            mine={mine}
            pool={pool}
            stacks={stacks}
            winner={winner}
            showOutcome={showOutcome}
            onPlace={onPlace}
            className={`${styles.zoneBird} ${styles[`zoneBirdRow${i + 1}`]}`}
          />
        )
      })}

      <div className={styles.realmPanel}>
        <img src={ASSET.realm} alt="" draggable={false} />
      </div>

      <ZoneCell
        zone="shark"
        label="SHARK"
        mult={24}
        panel={ASSET.ui('panel-shark')}
        portrait={ASSET.animal('shark', 'portrait')}
        bettingOpen={bettingOpen}
        mine={bets.get('shark') ?? 0}
        pool={(pools.get('shark') ?? 0) + (bets.get('shark') ?? 0)}
        stacks={stacks}
        winner={winner}
        showOutcome={showOutcome}
        onPlace={onPlace}
        className={styles.zoneShark}
      />

      <ZoneCell
        zone="beast"
        label="BEAST"
        mult={2}
        panel={ASSET.ui('panel-beast')}
        bettingOpen={bettingOpen}
        mine={bets.get('beast') ?? 0}
        pool={(pools.get('beast') ?? 0) + (bets.get('beast') ?? 0)}
        stacks={stacks}
        winner={winner}
        showOutcome={showOutcome}
        onPlace={onPlace}
        className={styles.zoneBeastGroup}
      />

      <ZoneCell
        zone="bird"
        label="BIRD"
        mult={2}
        panel={ASSET.ui('panel-bird')}
        bettingOpen={bettingOpen}
        mine={bets.get('bird') ?? 0}
        pool={(pools.get('bird') ?? 0) + (bets.get('bird') ?? 0)}
        stacks={stacks}
        winner={winner}
        showOutcome={showOutcome}
        onPlace={onPlace}
        className={styles.zoneBirdGroup}
      />
    </div>
  )
}
