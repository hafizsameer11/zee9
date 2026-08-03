import { memo, useMemo } from 'react'
import type { UpDownChoice } from '../../engines/dice'
import { CHIP_IMG_SM, ZONE_PLATE } from '../assets'
import { buildPiles, formatAmount } from '../chips'
import { ZONE_BOX } from '../constants'
import styles from '../sevenUpDown.module.css'

type Props = {
  zone: UpDownChoice
  range: string
  mult: number
  pot: number
  myBet: number
  headPct: number
  canBet: boolean
  won: boolean
  dimmed: boolean
  onBet: (zone: UpDownChoice) => void
  registerRef: (zone: UpDownChoice, el: HTMLButtonElement | null) => void
}

function TableZone({
  zone,
  range,
  mult,
  pot,
  myBet,
  headPct,
  canBet,
  won,
  dimmed,
  onBet,
  registerRef,
}: Props) {
  const box = ZONE_BOX[zone]
  // Rebuild piles only when the pot crosses a chip boundary, not every tick.
  const piles = useMemo(() => buildPiles(zone, pot), [zone, pot])

  return (
    <button
      type="button"
      className={styles.zone}
      style={{
        left: `${box.left}%`,
        top: `${box.top}%`,
        width: `${box.width}%`,
        height: `${box.height}%`,
      }}
      disabled={!canBet}
      onClick={() => onBet(zone)}
      ref={(el) => registerRef(zone, el)}
      aria-label={`Bet ${range}, pays ${mult}x`}
    >
      {won && <span className={styles.zoneWinBurst} aria-hidden />}
      <img
        src={won ? ZONE_PLATE[zone].win : ZONE_PLATE[zone].idle}
        alt=""
        draggable={false}
        className={`${styles.zonePlate} ${dimmed ? styles.zoneDim : ''}`}
      />

      <span className={styles.zoneHead} style={{ height: `${headPct}%` }}>
        <span className={styles.zoneRange}>{range}</span>
        <span className={styles.zoneMult}>×{mult}</span>
      </span>

      <span className={styles.zonePiles}>
        {piles.map((p) => (
          <span key={p.key} className={styles.pile} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            {p.chips.map((c, i) => (
              <img
                key={i}
                src={CHIP_IMG_SM[c.value]}
                alt=""
                draggable={false}
                className={styles.pileChip}
                style={{
                  bottom: i * 4,
                  transform: `translateX(-50%) rotate(${c.rot}deg)`,
                  zIndex: i,
                }}
              />
            ))}
          </span>
        ))}
      </span>

      {pot > 0 && (
        <span className={styles.zonePot} style={{ top: `${headPct + 3}%` }}>
          {formatAmount(pot)}
        </span>
      )}

      {myBet > 0 && <span className={styles.zoneMine}>YOU {formatAmount(myBet)}</span>}
    </button>
  )
}

export default memo(TableZone)
