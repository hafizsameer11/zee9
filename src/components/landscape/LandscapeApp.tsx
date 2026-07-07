import { useEffect, useState, type ReactNode } from 'react'
import MobileLandscapeFrame from './MobileLandscapeFrame'
import styles from './LandscapeApp.module.css'

type Props = { children: ReactNode }

function isTouchDevice() {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
      window.matchMedia('(max-width: 920px)').matches)
  )
}

export default function LandscapeApp({ children }: Props) {
  const [isPortrait, setIsPortrait] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const applyTouch = () => root.classList.toggle('is-touch-device', isTouchDevice())
    applyTouch()

    const check = () => setIsPortrait(window.innerHeight > window.innerWidth)
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    window.addEventListener('resize', applyTouch)
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
      window.removeEventListener('resize', applyTouch)
      root.classList.remove('is-touch-device')
    }
  }, [])

  return (
    <div className={styles.root}>
      <div className={`${styles.viewport} ${isPortrait ? styles.rotated : ''}`}>
        <MobileLandscapeFrame>{children}</MobileLandscapeFrame>
      </div>
    </div>
  )
}
