import { useEffect, useRef } from 'react'
import { ASSET } from '../constants/gameConfig'
import { MULT_SRC, SYMBOL_META, WHEEL_TOKEN_SRC, type Fg2Symbol, type SpecialToken } from '../constants/symbolConfig'
import styles from '../styles/fortuneGems2.module.css'

function tokenSrc(t: SpecialToken) {
  return t.kind === 'wheel' ? WHEEL_TOKEN_SRC[t.color] : MULT_SRC[t.value]
}

type ReelProps = {
  grid: Fg2Symbol[]
  strips: readonly [Fg2Symbol[], Fg2Symbol[], Fg2Symbol[]]
  spinning: boolean
  stoppingReels: boolean[]
  winCells: Set<number>
  dimNonWins: boolean
}

export function ReelGrid({ grid, strips, spinning, stoppingReels, winCells, dimNonWins }: ReelProps) {
  return (
    <div className={styles.reelGrid}>
      {[0, 1, 2].map((col) => {
        const stopping = stoppingReels[col]
        const showSpin = spinning && !stopping
        const colSyms = showSpin
          ? strips[col]
          : [grid[col]!, grid[col + 3]!, grid[col + 6]!]
        return (
          <div key={col} className={styles.reelCol}>
            <div className={styles.reelWindow}>
              <div
                className={`${styles.reelStrip} ${showSpin ? styles.spinning : ''} ${stopping && spinning ? styles.stopping : ''}`}
              >
                {(showSpin ? [...colSyms, ...colSyms.slice(0, 3)] : colSyms).map((sym, i) => {
                  const row = showSpin ? -1 : i
                  const cellIndex = showSpin ? -1 : col + row * 3
                  const isWin = !showSpin && winCells.has(cellIndex)
                  const dim = dimNonWins && !showSpin && winCells.size > 0 && !isWin
                  return (
                    <div
                      key={`${col}-${i}-${sym}-${showSpin ? 's' : 'f'}`}
                      className={`${styles.cell} ${isWin ? styles.win : ''} ${dim ? styles.dim : ''}`}
                    >
                      <img src={SYMBOL_META[sym].src} alt={sym} draggable={false} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

type SpecialProps = {
  special: SpecialToken
  strip: SpecialToken[]
  spinning: boolean
  stopping: boolean
  highlight?: boolean
}

export function SpecialPanel({ special, strip, spinning, stopping, highlight }: SpecialProps) {
  const active = spinning || stopping
  const tokens =
    spinning && !stopping
      ? strip.slice(0, 12)
      : [strip[0] ?? special, special, strip[1] ?? special]
  return (
    <div
      className={`${styles.specialPanel} ${active ? styles.active : ''} ${highlight ? styles.specialWin : ''}`}
    >
      <div className={styles.specialTrack}>
        <div
          className={`${styles.specialStrip} ${spinning && !stopping ? styles.spinning : ''} ${stopping ? styles.stopping : ''}`}
        >
          {(spinning && !stopping ? [...tokens, ...tokens.slice(0, 3)] : tokens).map((t, i) => (
            <div
              key={i}
              className={`${styles.specialToken} ${!spinning && i === 1 ? styles.locked : ''} ${highlight && !spinning && i === 1 ? styles.tokenWin : ''}`}
            >
              <img src={tokenSrc(t)} alt="" draggable={false} />
            </div>
          ))}
        </div>
        <div
          className={`${styles.multSelect} ${highlight ? styles.multSelectWin : ''}`}
          style={{ backgroundImage: `url(${ASSET.multSelect})` }}
        />
      </div>
    </div>
  )
}

type WheelProps = {
  angle: number
  spinning: boolean
  turbo: boolean
  /** Faster cruise while reels are spinning */
  cruising?: boolean
}

/** Lucky wheel — always drifts slowly; accelerates on cruise; lands on bonus spin. */
export function LuckyWheel({ angle, spinning, turbo, cruising }: WheelProps) {
  const diskRef = useRef<HTMLImageElement>(null)
  const displayRef = useRef(0)
  const parentAngleRef = useRef(angle)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const el = diskRef.current
    if (!el) return

    let cancelled = false
    const cancel = () => {
      cancelled = true
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }

    if (spinning) {
      const parentDelta = angle - parentAngleRef.current
      parentAngleRef.current = angle
      const from = displayRef.current
      const to = from + Math.max(parentDelta, 360 * 5)
      const t0 = performance.now()
      const dur = turbo ? 2600 : 5200
      const frame = (now: number) => {
        if (cancelled) return
        const t = Math.min(1, (now - t0) / dur)
        // ease-out cubic — starts fast, lands soft
        const eased = 1 - (1 - t) ** 3
        const current = from + (to - from) * eased
        displayRef.current = current
        el.style.transform = `rotate(${current}deg)`
        if (t < 1) rafRef.current = requestAnimationFrame(frame)
      }
      rafRef.current = requestAnimationFrame(frame)
      return cancel
    }

    parentAngleRef.current = angle

    // Always keep a gentle idle drift (faster while reels cruise)
    let last = performance.now()
    const degPerSec = cruising ? (turbo ? 130 : 95) : turbo ? 28 : 18
    const frame = (now: number) => {
      if (cancelled) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      displayRef.current += degPerSec * dt
      el.style.transform = `rotate(${displayRef.current}deg)`
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
    return cancel
  }, [spinning, cruising, turbo, angle])

  return (
    <div
      className={`${styles.wheelHost} ${spinning ? styles.active : ''} ${cruising || !spinning ? styles.cruising : ''}`}
    >
      <img className={styles.wheelPointer} src={ASSET.pointer} alt="" draggable={false} />
      <div className={styles.wheelClip}>
        <img
          ref={diskRef}
          className={`${styles.wheelDisk} ${turbo ? styles.turbo : ''}`}
          src={ASSET.wheel}
          alt=""
          draggable={false}
        />
      </div>
    </div>
  )
}
