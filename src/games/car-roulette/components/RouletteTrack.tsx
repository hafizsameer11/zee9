import { ASSET } from '../constants/gameConfig'
import { TRACK_SLOTS } from '../utils/track'
import styles from '../styles/carRoulette.module.css'

type Props = {
  activeSlot: number | null
  winningSlot: number | null
  trail: number
}

export default function RouletteTrack({ activeSlot, winningSlot, trail }: Props) {
  return (
    <>
      {TRACK_SLOTS.map((slot) => {
        const isWin = winningSlot === slot.index
        const isActive = !isWin && activeSlot === slot.index
        const dist =
          activeSlot == null
            ? 99
            : (activeSlot - slot.index + TRACK_SLOTS.length) % TRACK_SLOTS.length
        const isTrail = !isWin && !isActive && dist > 0 && dist <= trail
        return (
          <div
            key={slot.index}
            className={[
              styles.tile,
              isActive ? styles.tileActive : '',
              isTrail ? styles.tileTrail : '',
              isWin ? styles.tileWinner : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ left: slot.x, top: slot.y, width: slot.w, height: slot.h }}
            data-slot={slot.index}
          >
            <img src={ASSET.emblem(slot.brand, true)} alt="" draggable={false} />
          </div>
        )
      })}
    </>
  )
}
