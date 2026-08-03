import { useEffect, useMemo, useState } from 'react'
import { ASSET } from '../constants/gameConfig'
import styles from '../styles/stage.module.css'

type CoinBurstProps = {
  active: boolean
  tier: 'none' | 'small' | 'medium' | 'big'
}

export function CoinBurst({ active, tier }: CoinBurstProps) {
  const coins = useMemo(() => {
    const n = tier === 'big' ? 18 : tier === 'medium' ? 10 : tier === 'small' ? 5 : 0
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      left: `${14 + (i * 4.5) % 72}%`,
      delay: `${(i % 6) * 0.06}s`,
      dx: `${-28 + (i % 10) * 6}px`,
      rot: `${(i % 5) * 90 + 180}deg`,
    }))
  }, [tier])

  if (!active || tier === 'none') return null

  return (
    <div className={styles.coinBurst} aria-hidden>
      {coins.map((c) => (
        <span
          key={c.id}
          className={styles.coin}
          style={{
            left: c.left,
            top: '36%',
            animationDelay: c.delay,
            ['--dx' as string]: c.dx,
            ['--rot' as string]: c.rot,
          }}
        />
      ))}
    </div>
  )
}

type SparkBurstProps = {
  active: boolean
  x?: string
  y?: string
}

export function SparkBurst({ active, x = '50%', y = '42%' }: SparkBurstProps) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        angle: i * 45,
        delay: `${i * 0.04}s`,
      })),
    [],
  )

  if (!active) return null

  return (
    <div className={styles.sparkBurst} style={{ left: x, top: y }} aria-hidden>
      {sparks.map((s) => (
        <img
          key={s.id}
          className={styles.spark}
          src={ASSET.spark}
          alt=""
          draggable={false}
          style={{
            ['--angle' as string]: `${s.angle}deg`,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  )
}

type MultGlowProps = {
  active: boolean
}

export function MultGlow({ active }: MultGlowProps) {
  if (!active) return null
  return <div className={styles.multGlowBurst} aria-hidden />
}

type CountUpProps = {
  value: number
  active: boolean
  className?: string
}

export function CountUpDisplay({ value, active, className }: CountUpProps) {
  const [shown, setShown] = useState(value)

  useEffect(() => {
    if (!active) {
      setShown(value)
      return
    }
    let frame = 0
    const start = shown
    const diff = value - start
    const steps = 20
    const id = window.setInterval(() => {
      frame++
      const t = frame / steps
      const eased = 1 - (1 - t) ** 3
      setShown(Math.round((start + diff * eased) * 100) / 100)
      if (frame >= steps) window.clearInterval(id)
    }, 32)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, active])

  return <span className={className}>{shown.toFixed(2)}</span>
}
