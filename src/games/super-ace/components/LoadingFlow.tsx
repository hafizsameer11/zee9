import { useMemo, useState } from 'react'
import { ASSET, symbolSrc } from '../constants/gameConfig'
import styles from '../styles/royalAce.module.css'

type Props = {
  progress: number
  ready: boolean
  stage: 'studio' | 'green' | 'play'
  onPlay: (skipNext: boolean) => void
}

export default function LoadingFlow({ progress, ready: _ready, stage, onPlay }: Props) {
  const [skip, setSkip] = useState(false)
  const pct = Math.min(100, Math.round(progress))

  const tip = useMemo(
    () =>
      [
        'Golden cards transform into WILDS after a win',
        'Match 5+ identical cards to cascade',
        'Combo multiplies: ×1 → ×2 → ×3 → ×5',
        '3 Scatter coins award 10 Free Spins',
      ][Math.floor(pct / 25) % 4],
    [pct],
  )

  if (stage === 'studio') {
    return (
      <div className={styles.loader}>
        <img className={styles.loaderStudio} src={ASSET.studio} alt="Studio" />
      </div>
    )
  }

  if (stage === 'play') {
    return (
      <div
        className={styles.playEntry}
        style={{ backgroundImage: `url(${ASSET.felt})` }}
      >
        <img className={styles.playLogo} src={ASSET.logo} alt="Royal Ace" />
        <button
          type="button"
          className={styles.playBtn}
          onClick={() => onPlay(skip)}
          aria-label="Play"
        >
          <img src={ASSET.playBtn} alt="PLAY" />
        </button>
      </div>
    )
  }

  return (
    <div className={styles.loaderGreen} style={{ backgroundImage: `url(${ASSET.loadingBg})` }}>
      <img className={styles.loaderLogo} src={ASSET.logo} alt="Royal Ace" />
      <img className={styles.loaderWild} src={symbolSrc('wild')} alt="WILD" />
      <p style={{ color: '#fff8d0', fontSize: 12, marginBottom: 12, textShadow: '0 1px 3px #000' }}>
        {tip}
      </p>
      <div className={styles.loaderBar}>
        <div className={styles.loaderFill} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.loaderPct}>loading…{pct}%</div>
      <label className={styles.skipRow}>
        <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} />
        Don&apos;t show next time
      </label>
    </div>
  )
}
