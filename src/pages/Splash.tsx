import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getAccess } from '../api/client'
import styles from './Splash.module.css'

export default function Splash() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(t)
          setTimeout(() => navigate(getAccess() ? '/home' : '/login'), 300)
          return 100
        }
        return p + 5
      })
    }, 50)
    return () => clearInterval(t)
  }, [navigate])

  return (
    <div className={styles.splash}>
      <div className={styles.crown}>👑</div>
      <h1 className={styles.brand}>Zee9</h1>
      <p className={styles.sub}>Play · Win · Earn</p>
      <div className={styles.loader}><div style={{ width: `${progress}%` }} /></div>
      <button type="button" className={styles.btn} onClick={() => navigate(getAccess() ? '/home' : '/login')}>Enter Game</button>
    </div>
  )
}
