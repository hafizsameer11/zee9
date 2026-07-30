import { useEffect, useState, type CSSProperties } from 'react'
import { ASSET } from '../constants/rouletteConfig'
import styles from './FlyingChip.module.css'

export type Flight = {
  id: string
  value: number
  fromX: number
  fromY: number
  toX: number
  toY: number
}

type Props = {
  flights: Flight[]
  onDone: (id: string) => void
}

export default function FlyingChips({ flights, onDone }: Props) {
  return (
    <div className={styles.layer} aria-hidden>
      {flights.map((f) => (
        <FlyingChip key={f.id} flight={f} onDone={onDone} />
      ))}
    </div>
  )
}

function FlyingChip({ flight, onDone }: { flight: Flight; onDone: (id: string) => void }) {
  const [go, setGo] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setGo(true))
    const done = window.setTimeout(() => onDone(flight.id), 380)
    return () => {
      cancelAnimationFrame(t)
      window.clearTimeout(done)
    }
  }, [flight.id, onDone])

  return (
    <img
      className={`${styles.chip} ${go ? styles.go : ''}`}
      src={ASSET.chip(flight.value, true)}
      alt=""
      style={
        {
          '--x0': `${flight.fromX}px`,
          '--y0': `${flight.fromY}px`,
          '--x1': `${flight.toX}px`,
          '--y1': `${flight.toY}px`,
        } as CSSProperties
      }
    />
  )
}
