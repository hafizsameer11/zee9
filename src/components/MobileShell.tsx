import type { ReactNode } from 'react'
import styles from './MobileShell.module.css'

type Props = {
  children: ReactNode
}

export default function MobileShell({ children }: Props) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.phone}>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}
