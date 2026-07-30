import { ASSET } from '../constants/gameConfig'
import styles from '../styles/doubleFortune.module.css'

type Props = {
  stage: 'studio' | 'loading' | 'getStarted'
  progress: number
  onGetStarted: () => void
  onSkipStudio?: () => void
}

export default function LoadingFlow({ stage, progress, onGetStarted }: Props) {
  if (stage === 'studio') {
    return (
      <div className={styles.studio}>
        <img src={ASSET.studio} alt="" className={styles.studioLogo} draggable={false} />
      </div>
    )
  }

  return (
    <div className={styles.loading}>
      <img
        className={styles.loadingBg}
        src={ASSET.loadingBg}
        onError={(e) => {
          ;(e.target as HTMLImageElement).src = ASSET.loadingBgFallback
        }}
        alt=""
        draggable={false}
      />
      <div className={styles.loadingPetals} aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <img
            key={i}
            src={ASSET.petal}
            className={styles.petal}
            style={{
              left: `${8 + (i * 7) % 84}%`,
              animationDelay: `${(i % 7) * 0.45}s`,
              animationDuration: `${7 + (i % 4)}s`,
            }}
            alt=""
          />
        ))}
      </div>
      <img className={styles.loadingLogo} src={ASSET.logo} alt="Double Fortune" draggable={false} />
      <p className={styles.loadingFeature}>
        WIN IN FREE SPINS WITH
        <br />
        DOUBLE SET OF REELS AND
        <br />
        X8 MULTIPLIER!
      </p>
      {stage === 'loading' && (
        <div className={styles.loadingBarWrap}>
          <div className={styles.loadingBarTrack}>
            <div className={styles.loadingBarFill} style={{ width: `${progress}%` }} />
          </div>
          <p className={styles.loadingPct}>Loading resources [{Math.round(progress)}%]</p>
          <p className={styles.loadingHint}>Downloading over Wi-Fi recommended for HD gaming!</p>
        </div>
      )}
      {stage === 'getStarted' && (
        <button type="button" className={styles.getStartedBtn} onClick={onGetStarted}>
          <img src={ASSET.getStarted} alt="Get Started" draggable={false} />
        </button>
      )}
      <div className={styles.loadingFooter}>
        <span className={styles.pgMark}>Z9</span>
        <span>PREMIUM WEDDING SLOTS</span>
      </div>
    </div>
  )
}
