import { useCallback, useId, useState, type CSSProperties } from 'react'
import {
  IconPrizeChip,
  IconPrizeGift,
  WheelPrizeIcon,
  wheelSegmentPath,
  type PrizeIconType,
} from './WheelPrizeIcons'
import styles from './LuckyWheelModal.module.css'

const SEGMENT_COUNT = 12
const SEGMENT_DEG = 360 / SEGMENT_COUNT
const WHEEL_CX = 100
const WHEEL_CY = 100
const WHEEL_R = 96

type Segment = {
  label: string
  icon: PrizeIconType
  color: string
  colorEnd: string
}

const SEGMENTS: Segment[] = [
  { label: '₹10,000', icon: 'chest', color: '#1565c0', colorEnd: '#0d47a1' },
  { label: 'SP-70CC', icon: 'bike', color: '#e65100', colorEnd: '#bf360c' },
  { label: 'Again', icon: 'ticket', color: '#f9a825', colorEnd: '#f57f17' },
  { label: '₹1,000', icon: 'gem', color: '#7b1fa2', colorEnd: '#4a148c' },
  { label: 'MOBILE', icon: 'phone', color: '#2e7d32', colorEnd: '#1b5e20' },
  { label: '₹200', icon: 'coins', color: '#1976d2', colorEnd: '#0d47a1' },
  { label: 'No Win', icon: 'lose', color: '#c2185b', colorEnd: '#880e4f' },
  { label: '₹50', icon: 'coins', color: '#fbc02d', colorEnd: '#f9a825' },
  { label: 'LAPTOP', icon: 'laptop', color: '#6a1b9a', colorEnd: '#4a148c' },
  { label: 'HOME', icon: 'home', color: '#00838f', colorEnd: '#006064' },
  { label: '₹500', icon: 'coins', color: '#d84315', colorEnd: '#bf360c' },
  { label: 'Again', icon: 'ticket', color: '#ef6c00', colorEnd: '#e65100' },
]

const WINNERS = [
  { name: 'Eliza', prize: '₹50', icon: 'coins' as PrizeIconType },
  { name: 'Matthew', prize: '₹10,000', icon: 'chest' as PrizeIconType },
  { name: 'Rosalie', prize: 'Again', icon: 'ticket' as PrizeIconType },
  { name: 'Muneeb', prize: '₹200', icon: 'coins' as PrizeIconType },
  { name: 'P6686238', prize: 'MOBILE', icon: 'phone' as PrizeIconType },
  { name: 'User_882', prize: '₹1,000', icon: 'gem' as PrizeIconType },
]

type Props = {
  onClose: () => void
  onDeposit?: () => void
}

export default function LuckyWheelModal({ onClose, onDeposit }: Props) {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const gradPrefix = useId().replace(/:/g, '')

  const spin = useCallback(() => {
    if (spinning) return
    setSpinning(true)
    const extra = 2160 + Math.random() * 360
    setRotation((r) => r + extra)
    window.setTimeout(() => setSpinning(false), 4200)
  }, [spinning])

  const winnerRows = [...WINNERS, ...WINNERS]

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Lucky Wheel">
      <div className={styles.sparkles} aria-hidden />
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
        ✕
      </button>

      <div className={styles.content}>
        <aside className={styles.winList}>
          <div className={styles.winListLights} aria-hidden />
          <h3 className={styles.winListTitle}>Winning List</h3>
          <div className={styles.winListScroll}>
            <ul className={styles.winListItems}>
              {winnerRows.map((w, i) => (
                <li key={`${w.name}-${w.prize}-${i}`}>
                  <span className={styles.winnerName}>{w.name}</span>
                  <span className={styles.winnerPrize}>
                    <WheelPrizeIcon type={w.icon} size={16} />
                    <span>{w.prize}</span>
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
              <div
                className={`${styles.wheel} ${spinning ? styles.wheelSpinning : ''}`}
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <svg className={styles.wheelSvg} viewBox="0 0 200 200" aria-hidden>
                  <defs>
                    {SEGMENTS.map((s, i) => (
                      <linearGradient
                        key={`grad-${s.label}-${i}`}
                        id={`${gradPrefix}-seg-${i}`}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor={s.color} />
                        <stop offset="100%" stopColor={s.colorEnd} />
                      </linearGradient>
                    ))}
                  </defs>
                  {SEGMENTS.map((s, i) => (
                    <path
                      key={`path-${s.label}-${i}`}
                      d={wheelSegmentPath(
                        WHEEL_CX,
                        WHEEL_CY,
                        WHEEL_R,
                        i * SEGMENT_DEG,
                        (i + 1) * SEGMENT_DEG,
                      )}
                      fill={`url(#${gradPrefix}-seg-${i})`}
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth="0.6"
                    />
                  ))}
                </svg>

                {SEGMENTS.map((s, i) => {
                  const angle = i * SEGMENT_DEG + SEGMENT_DEG / 2
                  return (
                    <div
                      key={`prize-${s.label}-${i}`}
                      className={styles.prizeSlot}
                      style={{ '--seg-angle': `${angle}deg` } as CSSProperties}
                    >
                      <div
                        className={styles.prizeInner}
                        style={{ '--seg-angle': `${angle}deg` } as CSSProperties}
                      >
                        <span className={styles.prizeIcon}>
                          <WheelPrizeIcon type={s.icon} size={34} />
                        </span>
                        <span className={styles.prizeLabel}>{s.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                className={styles.spinBtn}
                onClick={spin}
                disabled={spinning}
              >
                <span className={styles.spinBtnGlow} aria-hidden />
                <span>SPIN</span>
                <small>0</small>
              </button>
            </div>
          </div>

          <div className={styles.footer}>
            <div className={styles.progressBlock}>
              <p className={styles.progressText}>
                <IconPrizeChip size={12} />
                Recharge ₹1000 for 1 Lucky Draw
              </p>
              <div className={styles.bar}>
                <div className={styles.fill} style={{ width: '0%' }} />
                <span className={styles.barShine} aria-hidden />
              </div>
              <div className={styles.barLabels}>
                <span>0</span>
                <span>1000</span>
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
