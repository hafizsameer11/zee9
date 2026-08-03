import { useCallback, useEffect, useId, useMemo, useState, type CSSProperties } from 'react'
import {
  WheelPrizeIcon,
  wheelSegmentPath,
  type PrizeIconType,
} from './WheelPrizeIcons'
import { SEGMENT_PALETTE } from './luckyWheelAssets'
import { api } from '../../../api/client'
import { sound } from '../../../lib/sound'
import styles from './LuckyWheelModal.module.css'

type SpinResult = { label: string; amount: number; isPhysical: boolean }

type WheelPrize = {
  id: string
  label: string
  color: string
  isPhysical: boolean
  weight?: number
}

const WHEEL_CX = 100
const WHEEL_CY = 100
const WHEEL_R = 96

function darken(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  if (Number.isNaN(n)) return hex
  const r = Math.max(0, (n >> 16) - 40)
  const g = Math.max(0, ((n >> 8) & 0xff) - 40)
  const b = Math.max(0, (n & 0xff) - 40)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function prizeIcon(label: string, isPhysical: boolean): PrizeIconType {
  const l = label.toLowerCase()
  if (l === 'again' || l.includes('try again') || l.includes('again')) return 'ticket'
  if (l === 'none' || l === 'no win' || l.includes('not winning')) return 'lose'
  if (l.includes('laptop')) return 'laptop'
  if (l.includes('mobile') || l.includes('phone')) return 'phone'
  if (l.includes('bike') || l.includes('cc') || l.includes('sp-')) return 'bike'
  if (l.includes('10,000') || l.includes('10000')) return 'chest'
  if (l.includes('1,000') || l.includes('1000') || l.includes('5,000') || l.includes('5000'))
    return 'gem'
  if (isPhysical) return 'ticket'
  if (/\d/.test(l)) return 'coins'
  return 'coins'
}

type Props = {
  onClose: () => void
  onDeposit?: () => void
  onSpinDone?: () => void
  variant?: 'SPIN' | 'DEPOSIT'
}

export default function LuckyWheelModal({ onClose, onDeposit, onSpinDone, variant = 'SPIN' }: Props) {
  const [prizes, setPrizes] = useState<WheelPrize[]>([])
  const [tickets, setTickets] = useState(0)
  const [depositPerSpin, setDepositPerSpin] = useState(1000)
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<SpinResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPrizes, setShowPrizes] = useState(false)
  const [myPrizes, setMyPrizes] = useState<
    Array<{ id: string; label: string; amount: number; isPhysical: boolean; createdAt: string }>
  >([])
  const [loadingPrizes, setLoadingPrizes] = useState(false)
  const [recentWinners, setRecentWinners] = useState<
    Array<{ id: string; player: string; prize: string }>
  >([])
  const [source, setSource] = useState<'deposit' | 'betting'>(
    variant === 'SPIN' ? 'betting' : 'deposit',
  )
  const gradPrefix = useId().replace(/:/g, '')

  const wheelPath = variant === 'DEPOSIT' ? '/wheel/deposit' : '/wheel'
  const spinPath = variant === 'DEPOSIT' ? '/wheel/deposit/spin' : '/wheel/spin'

  const loadWheel = useCallback(() => {
    api
      .get(wheelPath)
      .then((data: any) => {
        setPrizes(data.prizes ?? [])
        setTickets(data.tickets ?? 0)
        setDepositPerSpin(data.depositRequired ?? 1000)
        setSource(data.source === 'betting' ? 'betting' : 'deposit')
      })
      .catch(() => setError('Could not load wheel'))
      .finally(() => setLoading(false))
    api
      .get(`/wheel/recent-winners?wheel=${variant}`)
      .then((data: any) => setRecentWinners(Array.isArray(data.items) ? data.items : []))
      .catch(() => {})
  }, [variant, wheelPath])

  useEffect(() => {
    loadWheel()
  }, [loadWheel])

  const openMyPrizes = async () => {
    setShowPrizes(true)
    setLoadingPrizes(true)
    try {
      const data = await api.get('/wheel/history')
      setMyPrizes(data.items ?? [])
    } catch {
      setMyPrizes([])
    } finally {
      setLoadingPrizes(false)
    }
  }

  const segmentCount = Math.max(prizes.length, 1)
  const segmentDeg = 360 / segmentCount

  const bulbs = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({ a: (360 / 24) * i, d: `${(i % 3) * 0.12}s` })),
    [],
  )
  const gems = useMemo(
    () => Array.from({ length: Math.max(segmentCount, 8) }, (_, i) => (360 / Math.max(segmentCount, 8)) * i),
    [segmentCount],
  )

  const spin = useCallback(async () => {
    if (spinning || prizes.length === 0) return
    if (tickets <= 0) {
      sound.play('error')
      setError(
        source === 'betting'
          ? `Wager Rs ${depositPerSpin.toLocaleString('en-PK')} to unlock spins`
          : `Deposit to earn spins (Rs 1,000 = 1, Rs 5,000 = 2, …)`,
      )
      return
    }
    setError(null)
    setSpinning(true)
    sound.play('spin', { volume: 0.6 })
    try {
      const res = await api.post(spinPath)
      const index = prizes.findIndex((p) => p.id === res.prize.id)
      const segMid = index >= 0 ? index * segmentDeg + segmentDeg / 2 : 0
      const target = 360 - segMid
      const current = rotation % 360
      const delta = (target - current + 360) % 360
      setRotation((r) => r + 2160 + delta)
      setTickets(res.tickets ?? 0)

      window.setTimeout(() => {
        setSpinning(false)
        setResult({ label: res.prize.label, amount: res.amount, isPhysical: res.prize.isPhysical })
        if (res.amount > 0 || res.prize.isPhysical) sound.play('bonus')
        else sound.play('lose', { volume: 0.45 })
        loadWheel()
        onSpinDone?.()
      }, 4200)
    } catch (e: any) {
      setSpinning(false)
      sound.play('error')
      setError(e?.message || 'Spin failed')
    }
  }, [
    spinning,
    prizes,
    rotation,
    segmentDeg,
    onSpinDone,
    tickets,
    depositPerSpin,
    loadWheel,
    spinPath,
    source,
  ])

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Lucky Wheel">
      <div className={styles.flare} aria-hidden />

      <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
        ←
      </button>

      {error && <div className={styles.errorToast}>{error}</div>}

      {result && (
        <div className={styles.resultOverlay} onClick={() => setResult(null)}>
          <div className={styles.resultCard} onClick={(e) => e.stopPropagation()}>
            <WheelPrizeIcon type={prizeIcon(result.label, result.isPhysical)} size={64} />
            <h3>
              {result.amount > 0
                ? `You won Rs ${result.amount.toLocaleString('en-PK')}!`
                : result.isPhysical
                  ? `You won a ${result.label}!`
                  : 'No win this time'}
            </h3>
            <p>
              {result.isPhysical
                ? 'Our team will contact you to arrange your prize.'
                : result.amount > 0
                  ? 'Added to your balance.'
                  : 'Better luck on your next spin.'}
            </p>
            <button type="button" onClick={() => setResult(null)}>
              Collect
            </button>
          </div>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.titleWrap}>
          <svg className={styles.crown} viewBox="0 0 64 40" aria-hidden>
            <defs>
              <linearGradient id={`${gradPrefix}-crown`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffe082" />
                <stop offset="100%" stopColor="#c79100" />
              </linearGradient>
            </defs>
            <path
              d="M8 32 L12 12 L24 24 L32 6 L40 24 L52 12 L56 32 Z"
              fill={`url(#${gradPrefix}-crown)`}
              stroke="#fff8e1"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="12" r="3" fill="#ab47bc" />
            <circle cx="32" cy="6" r="3.5" fill="#e040fb" />
            <circle cx="52" cy="12" r="3" fill="#ab47bc" />
          </svg>
          <h2 className={styles.title}>LUCKY WHEEL</h2>
        </div>

        <div className={styles.wheelStage}>
          <div className={styles.wheelWrap}>
            <div className={styles.outerGlow} aria-hidden />
            <div className={styles.goldRim} aria-hidden />
            <div className={styles.lights} aria-hidden>
              {bulbs.map((b) => (
                <span
                  key={b.a}
                  className={styles.bulb}
                  style={{ '--a': `${b.a}deg`, '--d': b.d } as CSSProperties}
                />
              ))}
            </div>
            <div className={styles.gems} aria-hidden>
              {gems.map((a) => (
                <span key={a} className={styles.gem} style={{ '--a': `${a}deg` } as CSSProperties} />
              ))}
            </div>

            <div className={styles.pointer} aria-hidden>
              <div className={styles.pointerFrame} />
              <div className={styles.pointerJewel} />
            </div>

            {loading ? (
              <div style={{ color: '#ffd54f', fontSize: 13, textAlign: 'center', paddingTop: '42%' }}>
                Loading wheel…
              </div>
            ) : (
              <div
                className={`${styles.wheel} ${spinning ? styles.wheelSpinning : ''}`}
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <svg className={styles.wheelSvg} viewBox="0 0 200 200" aria-hidden>
                  <defs>
                    {prizes.map((p, i) => {
                      const color = SEGMENT_PALETTE[i % SEGMENT_PALETTE.length]!
                      return (
                        <linearGradient
                          key={`g-${p.id}`}
                          id={`${gradPrefix}-seg-${i}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor={color} />
                          <stop offset="100%" stopColor={darken(color)} />
                        </linearGradient>
                      )
                    })}
                  </defs>
                  {prizes.map((p, i) => (
                    <path
                      key={`p-${p.id}`}
                      d={wheelSegmentPath(WHEEL_CX, WHEEL_CY, WHEEL_R, i * segmentDeg, (i + 1) * segmentDeg)}
                      fill={`url(#${gradPrefix}-seg-${i})`}
                      stroke="rgba(255,213,79,0.65)"
                      strokeWidth="1"
                    />
                  ))}
                </svg>

                {prizes.map((p, i) => {
                  const angle = i * segmentDeg + segmentDeg / 2
                  return (
                    <div
                      key={`slot-${p.id}`}
                      className={styles.prizeSlot}
                      style={
                        {
                          '--seg-angle': `${angle}deg`,
                          transform: `rotate(${angle}deg) translateY(calc(var(--wheel) * -0.33))`,
                        } as CSSProperties
                      }
                    >
                      <div
                        className={styles.prizeInner}
                        style={{ transform: `rotate(${-angle}deg)` }}
                      >
                        <span className={styles.prizeIcon}>
                          <WheelPrizeIcon type={prizeIcon(p.label, p.isPhysical)} size={34} />
                        </span>
                        <span className={styles.prizeLabel}>{p.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <button
              type="button"
              className={styles.spinBtn}
              onClick={spin}
              disabled={spinning || loading || prizes.length === 0 || tickets <= 0}
              aria-label="Spin"
            >
              <span>SPIN</span>
              <small>{tickets}</small>
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.winnerList}>
            <div className={styles.winnerListTitle}>Winning List</div>
            <div className={styles.winnerListRows}>
              {recentWinners.length > 0 ? (
                recentWinners.slice(0, 5).map((winner) => (
                  <div key={winner.id} className={styles.winnerRow}>
                    <span>{winner.player}</span>
                    <strong>{winner.prize}</strong>
                  </div>
                ))
              ) : (
                <div className={styles.winnerEmpty}>Winners will appear here</div>
              )}
            </div>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.addCash} onClick={() => onDeposit?.()}>
              <span className={styles.addCashShine} aria-hidden />
              Add Cash
            </button>
            <button type="button" className={styles.myPrizeBtn} onClick={() => void openMyPrizes()}>
              My Prize
            </button>
          </div>
        </div>
      </div>

      {showPrizes && (
        <div className={styles.sheetOverlay} onClick={() => setShowPrizes(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <h3>My Prizes</h3>
            {loadingPrizes && <p>Loading…</p>}
            {!loadingPrizes && myPrizes.length === 0 && <p>No prizes yet — spin to win!</p>}
            {!loadingPrizes &&
              myPrizes.map((p) => (
                <div key={p.id} className={styles.sheetRow}>
                  <span>{p.label}</span>
                  <strong>
                    {p.amount > 0 ? `Rs ${p.amount}` : p.isPhysical ? 'Physical' : '—'}
                  </strong>
                </div>
              ))}
            <button type="button" className={styles.sheetBtn} onClick={() => setShowPrizes(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
