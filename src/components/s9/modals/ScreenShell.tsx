import type { ReactNode } from 'react'
import styles from './screen.module.css'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
  headerRight?: ReactNode
}

export default function ScreenShell({ title, onClose, children, headerRight }: Props) {
  return (
    <div className={styles.overlay}>
      <div className={styles.screen}>
        <header className={styles.header}>
          <button type="button" className={styles.back} onClick={onClose}>↩</button>
          <h1>{title}</h1>
          {headerRight && <div className={styles.headerRight}>{headerRight}</div>}
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}
