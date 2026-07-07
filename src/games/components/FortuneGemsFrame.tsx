import type { ReactNode } from 'react'
import { GEMS_MULTIPLIERS } from '../engines/fortuneGems'
import { FG_ASSETS } from './fortuneGemsAssets'
import styles from './fortuneGems.module.css'

type FortuneGemsFrameProps = {
  children: ReactNode
  multIndex?: number
  showMultiplier?: boolean
}

export function FortuneGemsFrame({ children, multIndex, showMultiplier = false }: FortuneGemsFrameProps) {
  return (
    <div className={styles.fgFrame}>
      <img className={styles.fgFrameImg} src={FG_ASSETS.frameSlot} alt="" draggable={false} />
      <div className={styles.fgFrameOverlay}>
        <div className={styles.fgReelGrid}>{children}</div>
        {showMultiplier &&
          GEMS_MULTIPLIERS.map((m, i) => (
            <div
              key={m}
              className={`${styles.fgMultBubble} ${i === multIndex ? styles.fgMultBubbleOn : ''}`}
              style={{ top: `${14 + i * 11.8}%` }}
            >
              {m}x
            </div>
          ))}
      </div>
    </div>
  )
}
