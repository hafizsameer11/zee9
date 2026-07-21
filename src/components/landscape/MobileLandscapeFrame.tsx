import type { CSSProperties, ReactNode } from 'react'
import styles from './MobileLandscapeFrame.module.css'

type Props = {
  children: ReactNode
  portrait?: boolean
  /** Desktop preview frame size (defaults to 896×414 landscape). */
  frameW?: number
  frameH?: number
}

export default function MobileLandscapeFrame({
  children,
  portrait = false,
  frameW,
  frameH,
}: Props) {
  const custom: CSSProperties | undefined =
    !portrait && frameW != null && frameH != null
      ? ({ '--frame-w': `${frameW}px`, '--frame-h': `${frameH}px` } as CSSProperties)
      : undefined

  return (
    <div className={`${styles.outer} ${portrait ? styles.outerPortrait : ''}`}>
      <div
        className={`${styles.device} ${portrait ? styles.devicePortrait : ''} ${custom ? styles.deviceCustom : ''}`}
        style={custom}
      >
        <div className={`${styles.screen} ${portrait ? styles.screenPortrait : ''} screen`}>
          {children}
        </div>
      </div>
    </div>
  )
}
