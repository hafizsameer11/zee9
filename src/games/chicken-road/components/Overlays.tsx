import { useEffect, useRef } from 'react'
import styles from './Overlays.module.css'
import { ASSET, formatMoney } from '../constants/gameConfig'
import { playLossOverlay, playWinOverlay, type TimelineHandle } from '../animations/timelines'

export function LoadingScreen({ progress, subtitle }: { progress: number; subtitle?: string }) {
  const value = Math.max(0, Math.min(100, Math.round(progress)))
  return (
    <div className={styles.loading} role="status">
      <img src={ASSET.loading('logo')} alt="Chicken Road" />
      <img className={styles.runner} src={ASSET.loading('chicken-run')} alt="" />
      <div className={styles.progress}><i style={{ width: `${value}%` }} /></div>
      <strong>{value}%</strong>
      <span>{subtitle ?? 'Preparing road…'}</span>
    </div>
  )
}

export function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <Modal onClose={onClose}>
      <h2>How to Play</h2>
      <ol>
        <li>Choose your stake and road difficulty.</li>
        <li>Press Play, then cross one traffic lane at a time.</li>
        <li>Every safe lane increases your multiplier.</li>
        <li>Cash out before the chicken is hit.</li>
      </ol>
      <button type="button" onClick={onClose}>Got it</button>
    </Modal>
  )
}

type SideMenuProps = {
  open: boolean
  muted: boolean
  musicOn: boolean
  onlineCount: number
  onClose: () => void
  onToggleMute: () => void
  onToggleMusic: () => void
  onHowTo: () => void
}

export function SideMenu(props: SideMenuProps) {
  if (!props.open) return null
  return (
    <div className={styles.modal}>
      <button className={styles.backdrop} type="button" onClick={props.onClose} aria-label="Close" />
      <aside className={styles.side}>
        <h2>Chicken Road</h2>
        <small>{props.onlineCount} players online</small>
        <button type="button" onClick={props.onToggleMute}>Sound {props.muted ? 'Off' : 'On'}</button>
        <button type="button" onClick={props.onToggleMusic}>Music {props.musicOn ? 'On' : 'Off'}</button>
        <button type="button" onClick={props.onHowTo}>How to Play</button>
        <button type="button" onClick={props.onClose}>Close</button>
      </aside>
    </div>
  )
}

export function LeaveConfirm(props: {
  open: boolean
  canCashOut: boolean
  potentialPayout: number
  betAmount: number
  onStay: () => void
  onCashOutAndLeave: () => void
  onLeaveAnyway: () => void
}) {
  if (!props.open) return null
  return (
    <Modal onClose={props.onStay}>
      <h2>Leave this round?</h2>
      <p>Your {formatMoney(props.betAmount)} Rs stake is still active.</p>
      {props.canCashOut && (
        <button className={styles.primary} type="button" onClick={props.onCashOutAndLeave}>
          Cash out {formatMoney(props.potentialPayout)} and leave
        </button>
      )}
      <button type="button" onClick={props.onStay}>Keep playing</button>
      <button className={styles.danger} type="button" onClick={props.onLeaveAnyway}>Leave anyway</button>
    </Modal>
  )
}

function useOutcome(show: boolean, reduced: boolean | undefined, win: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const animation = useRef<TimelineHandle | null>(null)
  useEffect(() => {
    animation.current?.kill()
    if (show) animation.current = win
      ? playWinOverlay(ref.current, reduced)
      : playLossOverlay(ref.current, reduced)
    return () => animation.current?.kill()
  }, [show, reduced, win])
  return ref
}

export function WinOverlay(props: {
  show: boolean
  amount: number
  multiplier: number
  reducedMotion?: boolean
  onContinue: () => void
}) {
  const ref = useOutcome(props.show, props.reducedMotion, true)
  if (!props.show) return null
  return (
    <div ref={ref} className={styles.outcome}>
      <div data-ui="rays" className={styles.rays} />
      <img data-ui="badge" src={ASSET.effect('win-badge')} alt="" />
      <h2>You Win</h2>
      <strong data-ui="amount">+{formatMoney(props.amount)} Rs</strong>
      <span>{props.multiplier.toFixed(2)}x</span>
      <button type="button" onClick={props.onContinue}>Continue</button>
    </div>
  )
}

export function LossOverlay(props: {
  show: boolean
  reducedMotion?: boolean
  betAmount: number
  laneReached?: number
  onRestart: () => void
}) {
  const ref = useOutcome(props.show, props.reducedMotion, false)
  if (!props.show) return null
  return (
    <div ref={ref} className={styles.outcome}>
      <div data-ui="flash" className={styles.flash} />
      <img data-ui="badge" src={ASSET.effect('loss-badge')} alt="" />
      <h2>Road Closed</h2>
      <p>Lost {formatMoney(props.betAmount)} Rs{props.laneReached != null ? ` at lane ${props.laneReached + 1}` : ''}</p>
      <button type="button" onClick={props.onRestart}>Try again</button>
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className={styles.modal} role="dialog" aria-modal="true">
      <button className={styles.backdrop} type="button" onClick={onClose} aria-label="Close" />
      <div className={styles.panel}>{children}</div>
    </div>
  )
}
