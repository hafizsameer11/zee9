import type { ReactNode } from 'react'
import { sound } from '../../../lib/sound'
import styles from './modal.module.css'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  full?: boolean
  hideSupport?: boolean
  bodyClassName?: string
}

export default function S9ModalShell({
  title,
  onClose,
  children,
  wide,
  full,
  hideSupport,
  bodyClassName,
}: Props) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={`${styles.panel} ${wide ? styles.wide : ''} ${full ? styles.full : ''}`}>
        <header className={styles.header}>
          {hideSupport ? (
            <span className={styles.headerSpacer} aria-hidden />
          ) : (
            <button type="button" className={styles.supportBtn} aria-label="Support" data-sfx="notify">
              🎧
            </button>
          )}
          <h2>{title}</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => {
              sound.play('close', { volume: 0.5 })
              onClose()
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div className={`${styles.body} ${bodyClassName ?? ''}`}>{children}</div>
      </div>
    </div>
  )
}
