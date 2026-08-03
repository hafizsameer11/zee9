import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { isPortraitGame } from '../../games/registry'
import MobileLandscapeFrame from './MobileLandscapeFrame'
import styles from './LandscapeApp.module.css'

type Props = { children: ReactNode }

/** Games that need a taller landscape desktop preview frame (850×480). */
const WIDE_FRAME_GAMES = new Set([
  'money-coming',
  'wingo-lottery',
  'roulette',
  'dragon-tiger',
  'chicken-road',
  'fortune-gems-2',
  'car-roulette',
])

function isTouchDevice() {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
      window.matchMedia('(max-width: 920px)').matches)
  )
}

function playGameIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/(?:play|preview)\/([^/]+)/)
  return m?.[1] ?? null
}

function isPaymentPath(pathname: string) {
  return pathname.startsWith('/pay/') || pathname === '/payment'
}

export default function LandscapeApp({ children }: Props) {
  const location = useLocation()
  const gameId = playGameIdFromPath(location.pathname)
  const portraitNative = (gameId != null && isPortraitGame(gameId)) || isPaymentPath(location.pathname)
  const wideFrame = gameId != null && WIDE_FRAME_GAMES.has(gameId)
  const [isPortrait, setIsPortrait] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const applyTouch = () => root.classList.toggle('is-touch-device', isTouchDevice())
    applyTouch()

    const check = () =>
      setIsPortrait(
        !portraitNative && isTouchDevice() && window.innerHeight > window.innerWidth,
      )
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
  }, [portraitNative])

  useEffect(() => {
    document.documentElement.classList.toggle('portrait-game', portraitNative)
    return () => document.documentElement.classList.remove('portrait-game')
  }, [portraitNative])

  return (
    <div className={`${styles.root} ${portraitNative ? styles.rootPortrait : ''}`}>
      <div
        className={`${styles.viewport} ${isPortrait ? styles.rotated : ''} ${
          portraitNative ? styles.viewportPortrait : ''
        }`}
      >
        <MobileLandscapeFrame
          portrait={portraitNative}
          frameW={wideFrame ? 850 : undefined}
          frameH={wideFrame ? 480 : undefined}
        >
          {children}
        </MobileLandscapeFrame>
      </div>
    </div>
  )
}
