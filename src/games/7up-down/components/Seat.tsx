import { memo, useState } from 'react'
import type { UpDownChoice } from '../../engines/dice'
import { formatAmount } from '../chips'
import styles from '../sevenUpDown.module.css'

export type SeatData = {
  id: string
  name: string
  total: number
  lastSide: UpDownChoice
  isMe?: boolean
}

const SIDE_CLASS: Record<UpDownChoice, string> = {
  down: styles.sideDown!,
  seven: styles.sideSeven!,
  up: styles.sideUp!,
}

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(seed)}&size=96`
}

function Seat({
  seat,
  registerRef,
}: {
  seat: SeatData | null
  registerRef: (id: string, el: HTMLDivElement | null) => void
}) {
  const [broken, setBroken] = useState(false)

  if (!seat) {
    return (
      <div className={`${styles.seat} ${styles.seatEmpty}`}>
        <div className={styles.seatAvatar}>+</div>
        <span className={styles.seatName}>Open seat</span>
      </div>
    )
  }

  const initials = seat.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?'

  return (
    <div className={styles.seat} ref={(el) => registerRef(seat.id, el)}>
      <div className={styles.seatAvatar}>
        {broken ? initials : (
          <img src={avatarUrl(seat.id)} alt="" onError={() => setBroken(true)} draggable={false} />
        )}
        <span className={`${styles.seatSideDot} ${SIDE_CLASS[seat.lastSide]}`} aria-hidden />
      </div>
      <span className={styles.seatName}>{seat.isMe ? 'You' : seat.name}</span>
      <span className={styles.seatBet}>{formatAmount(seat.total)}</span>
    </div>
  )
}

export default memo(Seat)
