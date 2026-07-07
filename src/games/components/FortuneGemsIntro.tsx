import { useState } from 'react'
import {
  FG_ASSETS,
  INTRO_PANEL_COUNT,
  UI_SPRITES,
  uiSpriteStyle,
} from './fortuneGemsAssets'
import styles from './fortuneGems.module.css'

const INTRO_HINTS = [
  'Gain great rewards for any full board!',
  'Wild symbols substitute for any symbol!',
  'Extra reel multiplies every win!',
]

type FortuneGemsIntroProps = {
  onContinue: (skipNext: boolean) => void
  onBack: () => void
}

export default function FortuneGemsIntro({ onContinue, onBack }: FortuneGemsIntroProps) {
  const [slide, setSlide] = useState(0)
  const [skipNext, setSkipNext] = useState(false)

  const goPrev = () => setSlide((s) => (s - 1 + INTRO_PANEL_COUNT) % INTRO_PANEL_COUNT)
  const goNext = () => setSlide((s) => (s + 1) % INTRO_PANEL_COUNT)
  const finish = () => onContinue(skipNext)

  return (
    <div className={styles.fgScreen}>
      <header className={styles.fgHeader}>
        <button type="button" className={styles.fgBackBtn} onClick={onBack} aria-label="Back">
          <span className={styles.fgBackIcon}>←</span>
        </button>
        <div className={styles.fgLogoWrap}>
          <span className={styles.fgLogoSprite} style={uiSpriteStyle(UI_SPRITES.logo, 26)} />
        </div>
        <div className={styles.fgHeaderSpacer} />
      </header>

      <div className={styles.fgIntroStage}>
        <div className={styles.fgIntroViewport}>
          <img
            className={styles.fgIntroStrip}
            src={FG_ASSETS.bgIntroStrip}
            alt=""
            draggable={false}
            style={{ transform: `translateX(-${(slide * 100) / INTRO_PANEL_COUNT}%)` }}
          />
        </div>
        <button type="button" className={styles.fgIntroArrowL} aria-label="Previous" onClick={goPrev} />
        <button type="button" className={styles.fgIntroArrowR} aria-label="Next" onClick={goNext} />
      </div>

      <footer className={styles.fgIntroFooter}>
        <p className={styles.fgIntroHint}>{INTRO_HINTS[slide]}</p>
        <div className={styles.fgIntroDots}>
          {Array.from({ length: INTRO_PANEL_COUNT }, (_, i) => (
            <span key={i} className={`${styles.fgDot} ${i === slide ? styles.fgDotOn : ''}`} />
          ))}
        </div>
        <div className={styles.fgIntroActions}>
          <button type="button" className={styles.fgContinueBtn} onClick={finish}>
            <span style={uiSpriteStyle(UI_SPRITES.btnGreen, 42)} />
            <span className={styles.fgContinueLabel}>Continue</span>
          </button>
          <label className={styles.fgSkipLabel}>
            <input type="checkbox" checked={skipNext} onChange={(e) => setSkipNext(e.target.checked)} />
            Don&apos;t show next time
          </label>
        </div>
      </footer>
    </div>
  )
}
