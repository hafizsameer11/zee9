import { useCallback, useEffect, useId, useState, type CSSProperties } from 'react'
import {
  IconPrizeChip,
  IconPrizeGift,
  WheelPrizeIcon,
  wheelSegmentPath,
  type PrizeIconType,
} from './WheelPrizeIcons'
import { api } from '../../../api/client'
import { sound } from '../../../lib/sound'
import styles from './LuckyWheelModal.module.css'

type SpinResult = { label: string; amount: number; isPhysical: boolean }

type WheelPrize = {
  id: string
  label: string
  color: string
  isPhysical: boolean
}

const WHEEL_CX = 100
const WHEEL_CY = 100
const WHEEL_R = 96

function prizeIcon(label: string, isPhysical: boolean): PrizeIconType {
  const l = label.toLowerCase()
  if (l === 'none' || l === 'no win' || l.includes('try again') || l === 'again') return 'lose'
  if (l.includes('laptop')) return 'laptop'
  if (l.includes('mobile') || l.includes('phone')) return 'phone'
  if (l.includes('bike')) return 'bike'
  if (l.includes('home')) return 'home'
  if (l.includes('10,000') || l.includes('10000')) return 'chest'
  if (l.includes('1,000') || l.includes('1000')) return 'gem'
  if (isPhysical) return 'ticket'
  return 'coins'
}

function darken(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  if (Number.isNaN(n)) return hex
  const r = Math.max(0, (n >> 16) - 30)
  const g = Math.max(0, ((n >> 8) & 0xff) - 30)
  const b = Math.max(0, (n & 0xff) - 30)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
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
  const [depositProgress, setDepositProgress] = useState(0)
  const [progressPct, setProgressPct] = useState(0)
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<SpinResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const gradPrefix = useId().replace(/:/g, '')

  const wheelPath = variant === 'DEPOSIT' ? '/wheel/deposit' : '/wheel'
  const spinPath = variant === 'DEPOSIT' ? '/wheel/deposit/spin' : '/wheel/spin'
  const loadWheel = useCallback(() => {
    api.get(wheelPath)
      .then((data: any) => {
        setPrizes(data.prizes ?? [])
        setTickets(data.tickets ?? 0)
        setDepositPerSpin(data.depositRequired ?? 1000)
        setDepositProgress(data.depositProgress ?? 0)
        setProgressPct(data.progressPct ?? 0)
      })
      .catch(() => setError('Could not load wheel'))
      .finally(() => setLoading(false))
  }, [wheelPath])

  useEffect(() => { loadWheel() }, [loadWheel])

  const segmentCount = Math.max(prizes.length, 1)
  const segmentDeg = 360 / segmentCount

  const spin = useCallback(async () => {
    if (spinning || prizes.length === 0) return
    if (tickets <= 0) {
      sound.play('error')
      setError(`Deposit Rs ${depositPerSpin} to earn a spin`)
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
  }, [spinning, prizes, rotation, segmentDeg, onSpinDone, tickets, depositPerSpin, loadWheel, spinPath])

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Lucky Wheel">
      <div className={styles.sparkles} aria-hidden />
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
        ✕
      </button>

      {error && (
        <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', background: '#c62828', color: '#fff', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, zIndex: 30 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.62)', zIndex: 40 }} onClick={() => setResult(null)}>
          <div style={{ background: 'linear-gradient(180deg,#3a1a00,#1a0c00)', border: '2px solid #ffd54f', borderRadius: 18, padding: '26px 30px', textAlign: 'center', maxWidth: 300 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 48 }}>{result.isPhysical ? '🎁' : result.amount > 0 ? '🎉' : '🍀'}</div>
            <h3 style={{ color: '#ffd54f', margin: '8px 0 4px', fontSize: 20 }}>
              {result.amount > 0 ? `You won Rs ${result.amount.toLocaleString('en-PK')}!` : result.isPhysical ? `You won a ${result.label}!` : 'No win this time'}
            </h3>
            <p style={{ color: '#e8d0a0', fontSize: 12, margin: '4px 0 16px' }}>
              {result.isPhysical ? 'Our team will contact you to arrange your prize.' : result.amount > 0 ? 'Added to your bonus balance.' : 'Better luck on your next spin.'}
            </p>
            <button type="button" onClick={() => setResult(null)} style={{ background: 'linear-gradient(180deg,#ffb300,#e65100)', border: '1px solid #ffe082', color: '#fff', fontWeight: 800, borderRadius: 10, padding: '10px 28px', fontSize: 14 }}>
              Collect
            </button>
          </div>
        </div>
      )}

      <div className={styles.content}>
        <aside className={styles.winList}>
          <div className={styles.winListLights} aria-hidden />
          <h3 className={styles.winListTitle}>Prizes</h3>
          <div className={styles.winListScroll}>
            <ul className={styles.winListItems}>
              {prizes.map((p) => (
                <li key={p.id}>
                  <span className={styles.winnerName}>{p.label}</span>
                  <span className={styles.winnerPrize}>
                    <WheelPrizeIcon type={prizeIcon(p.label, p.isPhysical)} size={16} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <button type="button" className={styles.myPrize}>
            <span className={styles.myPrizeIcon}>
              <IconPrizeGift size={32} />
            </span>
            <span>My Prize</span>
          </button>
        </aside>

        <div className={styles.wheelArea}>
          <div className={styles.titleWrap}>
            <span className={styles.titleGlow} aria-hidden />
            <h2 className={styles.title}>LUCKY WHEEL</h2>
          </div>

          <div className={styles.wheelStage}>
            <div className={styles.wheelWrap}>
              <div className={styles.lightRing} aria-hidden />
              <div className={styles.frameShine} aria-hidden />
              <div className={styles.pointer} aria-hidden />
              {loading ? (
                <div style={{ color: '#ffd54f', fontSize: 13, padding: 40 }}>Loading wheel…</div>
              ) : (
                <div
                  className={`${styles.wheel} ${spinning ? styles.wheelSpinning : ''}`}
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <svg className={styles.wheelSvg} viewBox="0 0 200 200" aria-hidden>
                    <defs>
                      {prizes.map((p, i) => (
                        <linearGradient
                          key={`grad-${p.id}-${i}`}
                          id={`${gradPrefix}-seg-${i}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor={p.color} />
                          <stop offset="100%" stopColor={darken(p.color)} />
                        </linearGradient>
                      ))}
                    </defs>
                    {prizes.map((p, i) => (
                      <path
                        key={`path-${p.id}`}
                        d={wheelSegmentPath(WHEEL_CX, WHEEL_CY, WHEEL_R, i * segmentDeg, (i + 1) * segmentDeg)}
                        fill={`url(#${gradPrefix}-seg-${i})`}
                        stroke="rgba(255,255,255,0.22)"
                        strokeWidth="0.6"
                      />
                    ))}
                  </svg>

                  {prizes.map((p, i) => {
                    const angle = i * segmentDeg + segmentDeg / 2
                    return (
                      <div
                        key={`prize-${p.id}`}
                        className={styles.prizeSlot}
                        style={{ '--seg-angle': `${angle}deg` } as CSSProperties}
                      >
                        <div
                          className={styles.prizeInner}
                          style={{ '--seg-angle': `${angle}deg` } as CSSProperties}
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
              >
                <span className={styles.spinBtnGlow} aria-hidden />
                <span>SPIN</span>
                <small>{tickets}</small>
              </button>
            </div>
          </div>

          <div className={styles.footer}>
            <div className={styles.progressBlock}>
              <p className={styles.progressText}>
                <IconPrizeChip size={12} />
                Recharge Rs {depositPerSpin.toLocaleString('en-PK')} for 1 Lucky Draw
              </p>
              <div className={styles.bar}>
                <div className={styles.fill} style={{ width: `${progressPct}%` }} />
                <span className={styles.barShine} aria-hidden />
              </div>
              <div className={styles.barLabels}>
                <span>{depositProgress.toFixed(0)}</span>
                <span>{depositPerSpin}</span>
              </div>
            </div>
            <button
              type="button"
              className={styles.addCash}
              onClick={() => onDeposit?.()}
            >
              <span className={styles.addCashShine} aria-hidden />
              Add Cash
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
