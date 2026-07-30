import styles from './Overlays.module.css'
import { ASSET } from '../constants/gameConfig'
import { SCENE } from '../constants/assetManifest'
import DragonCharacter from './DragonCharacter'
import TigerCharacter from './TigerCharacter'
import type { Winner } from '../constants/gameConfig'
import { useEffect, useRef } from 'react'
import { playTieWin, type TimelineHandle } from '../animations/timelines'
import Zee9LoadingScreen from '../../../components/Zee9LoadingScreen'

export function StopBettingBanner({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className={styles.stopBanner} role="status">
      <div className={styles.stopInner}>
        <span className={styles.stopShine} aria-hidden />
        <span className={styles.stopOrnament} aria-hidden />
        STOP BETTING
        <span className={styles.stopOrnament} aria-hidden />
      </div>
    </div>
  )
}

export function ClosedNotice({ show }: { show: boolean }) {
  if (!show) return null
  return <div className={styles.closedNotice}>Bets are closed for this round.</div>
}

export function VictoryOverlay({ show, amount }: { show: boolean; amount: number }) {
  if (!show || amount <= 0) return null
  return (
    <div className={styles.victory} role="status">
      <div className={styles.victoryRays} aria-hidden />
      <div className={styles.victoryGlow} aria-hidden />
      <img className={styles.crown} src={ASSET.icon('crown')} alt="" />
      <div className={styles.victoryTitle}>VICTORY</div>
      <div className={styles.victoryAmount}>+{amount.toLocaleString()}</div>
      <div className={styles.victoryParticles} aria-hidden />
    </div>
  )
}

export function WinnerStage({
  winner,
  show,
  reducedMotion,
}: {
  winner: Winner | null
  show: boolean
  reducedMotion?: boolean
}) {
  const tieRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<TimelineHandle | null>(null)

  useEffect(() => {
    handleRef.current?.kill()
    handleRef.current = null
    if (!show || winner !== 'tie') return
    handleRef.current = playTieWin(tieRef.current, undefined, reducedMotion)
    return () => {
      handleRef.current?.kill()
      handleRef.current = null
    }
  }, [show, winner, reducedMotion])

  if (!show || !winner) return null
  return (
    <div className={styles.winnerStage} aria-hidden>
      {winner === 'dragon' && (
        <div className={`${styles.charWrap} ${styles.dragonSide}`}>
          <DragonCharacter mode="winner" variant="stage" reducedMotion={reducedMotion} />
        </div>
      )}
      {winner === 'tiger' && (
        <div className={`${styles.charWrap} ${styles.tigerSide}`}>
          <TigerCharacter mode="winner" variant="stage" reducedMotion={reducedMotion} />
        </div>
      )}
      {winner === 'tie' && (
        <div ref={tieRef} className={styles.tieWrap}>
          <div data-energy="blue" className={styles.tieBlue} />
          <div data-energy="orange" className={styles.tieOrange} />
          <div data-energy="wave" className={styles.tieWave} />
          <img data-energy="ornament" className={styles.tieOrnament} src={SCENE.emblem} alt="" />
        </div>
      )}
    </div>
  )
}

/** Instant loading — Zee9 brand gate (no game panel underneath). */
export function GameLoadingScreen({ progress }: { progress: number }) {
  return (
    <Zee9LoadingScreen
      progress={progress}
      title="Dragon Tiger"
      subtitle="Preparing table…"
      fullScreen
    />
  )
}
