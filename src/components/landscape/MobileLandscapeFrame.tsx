import type { ReactNode } from 'react'
import styles from './MobileLandscapeFrame.module.css'

type Props = { children: ReactNode }

export default function MobileLandscapeFrame({ children }: Props) {
  return (
    <div className={styles.outer}>
      <div className={styles.device}>
        <div className={`${styles.screen} screen`}>{children}</div>
      </div>
    </div>
  )
}
