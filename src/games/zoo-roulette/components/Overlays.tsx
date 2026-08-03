import { useEffect, useRef, useState } from 'react'
import { ANIMAL_BY_ID, ASSET, type AnimalId } from '../constants/gameConfig'
import styles from '../styles/zooRoulette.module.css'

export function LoadingScreen({ progress, slow }: { progress: number; slow?: boolean }) {
  return (
    <div className={styles.loading} style={{ backgroundImage: `url(${ASSET.loading})` }}>
      <div className={styles.loadingInner}>
        <img className={styles.loadingHero} src={ASSET.animal('lion', 'winner')} alt="" draggable={false} />
        <div className={styles.loadingTitle}>ZOO ROULETTE</div>
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

  useEffect(() => {
    if (show) {
      setPhase('in')
      return
    }
    if (phaseRef.current === 'hidden') return
    setPhase('out')
    const t = window.setTimeout(() => setPhase('hidden'), 360)
    return () => window.clearTimeout(t)
  }, [show])

  if (phase === 'hidden') return null
  return (
    <div
      className={[
        styles.banner,
        kind === 'stop' ? styles.bannerStop : '',
        phase === 'out' ? styles.bannerOut : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <img className={styles.bannerImg} src={ASSET.banner(kind)} alt="" draggable={false} />
      <div className={styles.bannerText}>{kind === 'start' ? 'PLACE YOUR BETS' : 'STOP BETTING'}</div>
    </div>
  )
}

export function WinnerReveal({
  animal,
  show,
  reducedMotion,
}: {
  animal: AnimalId | null
  show: boolean
  reducedMotion: boolean
}) {
  if (!show || !animal) return null
  const a = ANIMAL_BY_ID.get(animal)!
  const jackpot = animal === 'golden_frog'
  return (
    <>
      <div className={styles.revealDim} aria-hidden />
      <img className={styles.revealRays} src={ASSET.fx('rays')} alt="" draggable={false} />
      <div className={`${styles.revealCard} ${jackpot ? styles.revealJackpot : ''}`}>
        <img
          className={styles.revealAnimal}
          src={ASSET.animal(animal, 'winner')}
          alt=""
          draggable={false}
          style={{ animation: reducedMotion ? 'none' : undefined }}
        />
        <div className={styles.revealRibbon}>
          <span className={styles.revealName}>{a.name}</span>
          <span className={styles.revealMult}>x{a.mult}</span>
        </div>
      </div>
      <img className={styles.revealSparks} src={ASSET.fx('sparks')} alt="" draggable={false} />
    </>
  )
}

export function InsufficientDialog({ show, onClose }: { show: boolean; onClose: () => void }) {
  if (!show) return null
  return (
    <div className={styles.dialogScrim} onClick={onClose} role="presentation">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="dialog">
        <h3>INSUFFICIENT BALANCE</h3>
        <p>Add funds to continue placing bets on the next round.</p>
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
          Select a chip and tap an animal or group zone during the betting window. When betting closes,
          the golden light races around the track and settles on a winning animal.
        </p>
        <ul>
          <li>Land animals: Monkey, Rabbit, Lion, Panda</li>
          <li>Birds: Swallow, Pigeon, Peacock, Eagle</li>
          <li>BEAST x2 and BIRD x2 cover their groups</li>
          <li>SHARK x24 is the high-value water bet</li>
          <li>Golden Frog on the track is the x100 jackpot tile</li>
          <li>Use REBET to repeat your last round</li>
        </ul>
      </div>
    </div>
  )
}
