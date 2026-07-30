import { useEffect, useMemo, useState } from 'react'
import { ASSET } from '../constants/gameConfig'
import styles from '../styles/fortuneGems2.module.css'

const FEATURES = [ASSET.feature1, ASSET.feature2, ASSET.feature3, ASSET.feature4]

type Props = {
  progress: number
  ready: boolean
  onContinue: (skipNext: boolean) => void
  /** When true, auto-enter shortly after assets are ready */
  autoEnter?: boolean
}

export default function LoadingScreen({ progress, ready, onContinue, autoEnter }: Props) {
  const [card, setCard] = useState(0)
  const [skip, setSkip] = useState(!!autoEnter)
  const chilis = useMemo(() => [1, 1, 1, 0, 0], [])
  const pct = Math.max(0, Math.min(100, Math.round(progress)))

  // Rotate feature cards while loading
  useEffect(() => {
    if (ready) return
    const t = window.setInterval(() => {
      setCard((c) => (c + 1) % FEATURES.length)
    }, 2200)
    return () => clearInterval(t)
  }, [ready])

  // Auto-continue when ready + skip / preferSkip
  useEffect(() => {
    if (!ready || !autoEnter) return
    const t = window.setTimeout(() => onContinue(true), 480)
    return () => clearTimeout(t)
  }, [ready, autoEnter, onContinue])

  return (
    <div className={styles.loader}>
      <div className={styles.loaderBg} style={{ backgroundImage: `url(${ASSET.bgLoading})` }} />
      <div className={styles.loaderShade} aria-hidden />
      <div className={styles.loaderVol}>
        Volatility:
        {chilis.map((on, i) => (
          <img key={i} src={on ? ASSET.chiliOn : ASSET.chiliOff} alt="" />
        ))}
      </div>
      <img className={styles.loaderLogo} src={ASSET.logo} alt="Fortune Gems 2" />
      <button
        type="button"
        className={`${styles.navArrow} ${styles.left}`}
        onClick={() => setCard((c) => (c + FEATURES.length - 1) % FEATURES.length)}
        aria-label="Previous"
      >
        ‹
      </button>
      <button
        type="button"
        className={`${styles.navArrow} ${styles.right}`}
        onClick={() => setCard((c) => (c + 1) % FEATURES.length)}
        aria-label="Next"
      >
        ›
      </button>
      <img className={styles.featureCard} src={FEATURES[card]} alt="" key={card} />
      <div className={styles.loaderBarWrap}>
        <div className={styles.loaderTrack} style={{ backgroundImage: `url(${ASSET.barTrack})` }}>
          <div
            className={styles.loaderFill}
            style={{ width: `${pct}%`, backgroundImage: `url(${ASSET.barFill})` }}
          />
        </div>
        <div className={styles.loaderPct}>
          {ready ? 'Ready!' : `Loading… ${pct}%`}
        </div>
      </div>
      {ready && !autoEnter && (
        <button type="button" className={styles.continueBtn} onClick={() => onContinue(skip)}>
          <img src={ASSET.continue} alt="Continue" />
        </button>
      )}
      {!autoEnter && (
        <label className={styles.skipRow}>
          <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} />
          Don&apos;t show next time
        </label>
      )}
    </div>
  )
}
