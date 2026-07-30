import { memo, useMemo } from 'react'
import { ASSET, EUROPEAN_WHEEL_ORDER, POCKET_ANGLE, RED_NUMBERS } from '../constants/rouletteConfig'
import styles from './RouletteWheel.module.css'

type Props = {
  size?: number
  rotorDeg: number
  ballDeg: number
  winningNumber?: number | null
  spinning?: boolean
}

function pocketFill(n: number) {
  if (n === 0) return 'url(#rzGreen)'
  if (RED_NUMBERS.has(n)) return 'url(#rzRed)'
  return 'url(#rzBlack)'
}

function RouletteWheel({ size = 280, rotorDeg, ballDeg, winningNumber = null, spinning }: Props) {
  const pockets = useMemo(() => {
    const cx = 200
    const cy = 200
    const outer = 188
    const inner = 78
    return EUROPEAN_WHEEL_ORDER.map((num, i) => {
      const a0 = ((i * POCKET_ANGLE - 90) * Math.PI) / 180
      const a1 = (((i + 1) * POCKET_ANGLE - 90) * Math.PI) / 180
      const mid = (a0 + a1) / 2
      const x0 = cx + outer * Math.cos(a0)
      const y0 = cy + outer * Math.sin(a0)
      const x1 = cx + outer * Math.cos(a1)
      const y1 = cy + outer * Math.sin(a1)
      const xi0 = cx + inner * Math.cos(a1)
      const yi0 = cy + inner * Math.sin(a1)
      const xi1 = cx + inner * Math.cos(a0)
      const yi1 = cy + inner * Math.sin(a0)
      const d = [
        `M ${x0} ${y0}`,
        `A ${outer} ${outer} 0 0 1 ${x1} ${y1}`,
        `L ${xi0} ${yi0}`,
        `A ${inner} ${inner} 0 0 0 ${xi1} ${yi1}`,
        'Z',
      ].join(' ')
      const tr = (outer + inner) / 2 + 16
      const tx = cx + tr * Math.cos(mid)
      const ty = cy + tr * Math.sin(mid)
      const rot = (mid * 180) / Math.PI + 90
      return { num, d, tx, ty, rot }
    })
  }, [])

  const ballR = 168
  const ballRad = ((ballDeg - 90) * Math.PI) / 180
  const ballX = 200 + ballR * Math.cos(ballRad)
  const ballY = 200 + ballR * Math.sin(ballRad)

  return (
    <div
      className={`${styles.wrap} ${spinning ? styles.spinning : ''} ${
        winningNumber != null ? styles.hasResult : ''
      }`}
      style={{ width: size, height: size }}
    >
      <span className={styles.wheelGlow} aria-hidden />
      <img className={styles.casing} src={ASSET.casing} alt="" draggable={false} />
      <svg className={styles.rotor} viewBox="0 0 400 400" style={{ transform: `rotate(${rotorDeg}deg)` }}>
        <defs>
          <linearGradient id="rzRed" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e03a3a" />
            <stop offset="45%" stopColor="#b01e24" />
            <stop offset="100%" stopColor="#6e1014" />
          </linearGradient>
          <linearGradient id="rzBlack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a3a42" />
            <stop offset="50%" stopColor="#17171a" />
            <stop offset="100%" stopColor="#050506" />
          </linearGradient>
          <linearGradient id="rzGreen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2ecc71" />
            <stop offset="55%" stopColor="#128a3f" />
            <stop offset="100%" stopColor="#0a4d24" />
          </linearGradient>
          <radialGradient id="rzHub" cx="42%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#6a4528" />
            <stop offset="55%" stopColor="#2a180e" />
            <stop offset="100%" stopColor="#0e0805" />
          </radialGradient>
          <linearGradient id="rzGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffe7a8" />
            <stop offset="40%" stopColor="#d4a84a" />
            <stop offset="100%" stopColor="#8a6418" />
          </linearGradient>
          <filter id="rzSoft">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.35" />
          </filter>
        </defs>
        <circle cx="200" cy="200" r="192" fill="#120c08" />
        {pockets.map((p) => (
          <g key={p.num}>
            <path
              d={p.d}
              fill={pocketFill(p.num)}
              stroke="rgba(230,190,110,0.65)"
              strokeWidth="1"
              className={winningNumber === p.num ? styles.winPocket : undefined}
            />
            <text
              x={p.tx}
              y={p.ty}
              fill="#fff8e8"
              fontSize="14"
              fontWeight="800"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${p.rot} ${p.tx} ${p.ty})`}
              style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
            >
              {p.num}
            </text>
          </g>
        ))}
        <circle cx="200" cy="200" r="78" fill="url(#rzHub)" stroke="url(#rzGold)" strokeWidth="4" />
        <circle cx="200" cy="200" r="70" fill="none" stroke="rgba(255,230,160,0.25)" strokeWidth="1.5" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = ((i * 45 - 90) * Math.PI) / 180
          return (
            <line
              key={i}
              x1={200 + 26 * Math.cos(a)}
              y1={200 + 26 * Math.sin(a)}
              x2={200 + 66 * Math.cos(a)}
              y2={200 + 66 * Math.sin(a)}
              stroke="url(#rzGold)"
              strokeWidth="2.2"
              strokeOpacity="0.75"
            />
          )
        })}
      </svg>
      <img className={styles.spindle} src={ASSET.spindle} alt="" draggable={false} />
      <img className={styles.pointer} src={ASSET.pointer} alt="" draggable={false} />
      <img
        className={styles.ball}
        src={ASSET.ball}
        alt=""
        draggable={false}
        style={{
          left: `${(ballX / 400) * 100}%`,
          top: `${(ballY / 400) * 100}%`,
        }}
      />
      <div className={styles.specular} aria-hidden />
      <div className={styles.shineRing} aria-hidden />
    </div>
  )
}

export default memo(RouletteWheel)
