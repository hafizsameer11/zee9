import { useEffect, useRef, useState } from 'react'
import { ASSET, BRAND_BY_ID, type BrandId } from '../constants/gameConfig'
import styles from '../styles/carRoulette.module.css'

export function LoadingScreen({
  progress,
  slow,
}: {
  progress: number
  slow?: boolean
}) {
  return (
    <div
      className={styles.loading}
      style={{ backgroundImage: `url(${ASSET.bgLite})` }}
    >
      <div className={styles.loadingInner}>
        <img
          className={styles.loadingCar}
          src={ASSET.car('vornik')}
          alt=""
          draggable={false}
        />
        <div className={styles.loadingTitle}>CAR ROULETTE</div>
        <div className={styles.loadingBar}>
          <div className={styles.loadingFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.loadingPct}>
          {slow ? 'Loading premium assets… ' : ''}
          {progress}%
        </div>
      </div>
    </div>
  )
}

export function PhaseBanner({ kind, show }: { kind: 'start' | 'stop'; show: boolean }) {
  const [phase, setPhase] = useState<'hidden' | 'in' | 'out'>('hidden')
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  // Keyed on `show` alone: the entry animation must never restart mid-flight.
  useEffect(() => {
    if (show) {
      setPhase('in')
      return
    }
    if (phaseRef.current === 'hidden') return
    setPhase('out')
    const t = window.setTimeout(() => setPhase('hidden'), 340)
    return () => window.clearTimeout(t)
  }, [show])

  const visible = phase !== 'hidden'
  const leaving = phase === 'out'

  if (!visible) return null
  return (
    <div
      className={[
        styles.banner,
        kind === 'stop' ? styles.bannerStop : '',
        leaving ? styles.bannerOut : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <img className={styles.bannerImg} src={ASSET.banner(kind)} alt="" draggable={false} />
      <div className={styles.bannerText}>
        {kind === 'start' ? 'START BETTING' : 'STOP BETTING'}
      </div>
    </div>
  )
}

export function CarPass({
  brand,
  reducedMotion,
  onDone,
}: {
  brand: BrandId | null
  reducedMotion: boolean
  onDone: () => void
}) {
  useEffect(() => {
    if (!brand) return
    const ms = reducedMotion ? 200 : 1150
    const t = window.setTimeout(onDone, ms)
    return () => window.clearTimeout(t)
  }, [brand, reducedMotion, onDone])

  if (!brand) return null
  const b = BRAND_BY_ID.get(brand)!

  return (
    <>
      <div className={styles.passDim} aria-hidden />
      <img className={styles.speedTrail} src={ASSET.fx('speed')} alt="" draggable={false} />
      <img
        className={styles.carPass}
        src={ASSET.car(brand)}
        alt=""
        draggable={false}
        style={{
          ['--scale' as string]: b.carScale,
          animation: reducedMotion
            ? 'none'
            : 'carSweep 1.15s cubic-bezier(0.15, 0.55, 0.25, 1) both',
          opacity: reducedMotion ? 0.9 : undefined,
          left: reducedMotion ? '18%' : undefined,
        }}
      />
      <style>{`
        @keyframes carSweep {
          0%   { transform: translate3d(115%, 10%, 0) scale(calc(var(--scale) * 0.78)) rotate(-5deg); opacity: 0; filter: blur(2.5px) brightness(1.25); }
          14%  { opacity: 1; filter: blur(0.8px) brightness(1.2); }
          48%  { transform: translate3d(6%, -4%, 0) scale(calc(var(--scale) * 1.08)) rotate(1.5deg); filter: blur(0) brightness(1.08); }
          100% { transform: translate3d(-125%, 8%, 0) scale(calc(var(--scale) * 0.88)) rotate(4deg); opacity: 0; filter: blur(1.8px) brightness(1.15); }
        }
      `}</style>
    </>
  )
}

export function WinnerFx({
  brand,
  show,
  boardRect,
}: {
  brand: BrandId | null
  show: boolean
  boardRect: { x: number; y: number; w: number; h: number }
}) {
  if (!show || !brand) return null
  const b = BRAND_BY_ID.get(brand)!
  return (
    <>
      <img
        className={styles.rays}
        src={ASSET.fx('rays')}
        alt=""
        draggable={false}
        style={{
          left: boardRect.x + boardRect.w / 2 - 110,
          top: boardRect.y + boardRect.h / 2 - 110,
        }}
      />
      <div className={styles.resultCard}>
        <img src={ASSET.car(brand)} alt="" draggable={false} />
        <div className={styles.resultName}>{b.name}</div>
        <div className={styles.resultMult}>x{b.mult}</div>
      </div>
    </>
  )
}

export function InsufficientDialog({
  show,
  onClose,
}: {
  show: boolean
  onClose: () => void
}) {
  if (!show) return null
  return (
    <div className={styles.dialogScrim} onClick={onClose} role="presentation">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="dialog">
        <h3>INSUFFICIENT BALANCE</h3>
        <p>Add funds to continue placing bets on the next marque.</p>
        <button type="button" className={styles.dialogBtn} onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  )
}

export function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className={styles.dialogScrim} onClick={onClose} role="presentation">
      <div className={styles.helpCard} onClick={(e) => e.stopPropagation()} role="dialog">
        <h3>HOW TO PLAY</h3>
        <p>
          Select a chip and tap a marque zone during the betting window. When betting closes the
          light races around the outer track and settles on a winning marque.
        </p>
        <ul>
          <li>x5 zones appear most often on the track</li>
          <li>x10 / x15 zones are rarer</li>
          <li>VORNIK x30 is the single jackpot tile</li>
          <li>Winning bets return stake × multiplier</li>
          <li>Use REBET to repeat your last round</li>
        </ul>
      </div>
    </div>
  )
}
