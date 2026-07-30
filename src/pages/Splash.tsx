import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getAccess } from '../api/client'
import { warmLobbyCritical } from '../lib/lobbyAssetWarmup'
import Zee9LoadingScreen from '../components/Zee9LoadingScreen'
import styles from './Splash.module.css'

export default function Splash() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState(4)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const started = performance.now()
    void warmLobbyCritical((pct) => {
      if (!cancelled) setProgress(Math.max(4, Math.min(96, pct)))
    })
      .catch(() => {})
      .finally(async () => {
        const elapsed = performance.now() - started
        const wait = Math.max(0, 700 - elapsed)
        if (wait) await new Promise((r) => window.setTimeout(r, wait))
        if (!cancelled) {
          setProgress(100)
          setReady(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    const t = window.setTimeout(() => {
      navigate(getAccess() ? '/home' : '/login', { replace: true })
    }, 280)
    return () => window.clearTimeout(t)
  }, [ready, navigate])

  return (
    <div className={styles.splash}>
      <Zee9LoadingScreen
        progress={progress}
        title="Zee9"
        subtitle={ready ? 'Welcome' : 'Loading lobby…'}
      />
      {ready && (
        <button
          type="button"
          className={styles.btn}
          onClick={() => navigate(getAccess() ? '/home' : '/login')}
        >
          Enter Game
        </button>
      )}
    </div>
  )
}
