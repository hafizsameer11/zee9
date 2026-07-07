import { useEffect, useState, type ReactNode } from 'react'
import styles from './LandscapeShell.module.css'

type Props = {
  children: ReactNode
}

export default function LandscapeShell({ children }: Props) {
  const [isPortrait, setIsPortrait] = useState(false)

  useEffect(() => {
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth)
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [])

  useEffect(() => {
    document.body.classList.add('game-mode')
    return () => document.body.classList.remove('game-mode')
  }, [])

  return (
    <div className={styles.overlay}>
      {isPortrait && (
        <div className={styles.rotateHint} aria-live="polite">
          <span className={styles.rotateIcon}>📱</span>
          <p>Rotate your phone for the best experience</p>
        </div>
      )}
      <div className={`${styles.landscape} ${isPortrait ? styles.rotated : ''}`}>
        {children}
      </div>
    </div>
  )
}
