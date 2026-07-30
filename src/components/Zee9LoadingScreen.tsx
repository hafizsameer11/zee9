import { useEffect, useState } from 'react'
import styles from './Zee9LoadingScreen.module.css'

export const ZEE9_LOGO = '/brand/zee9-logo.webp'
export const ZEE9_LOGO_PNG = '/brand/zee9-logo.png'

type Props = {
  progress?: number
  title?: string
  subtitle?: string
  fullScreen?: boolean
}

/** Premium animated Zee9 brand loader — use while assets warm. */
export default function Zee9LoadingScreen({
  progress = 0,
  title = 'Zee9',
  subtitle = 'Loading…',
  fullScreen = true,
}: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)))
  const [logoSrc, setLogoSrc] = useState(ZEE9_LOGO)

  useEffect(() => {
    // Ensure logo is decoded ASAP
    const img = new Image()
    img.src = ZEE9_LOGO
    img.onerror = () => setLogoSrc(ZEE9_LOGO_PNG)
  }, [])

  return (
    <div className={`${styles.root} ${fullScreen ? styles.full : styles.embed}`} role="status" aria-live="polite">
      <div className={styles.bg} aria-hidden />
      <div className={styles.grid} aria-hidden />
      <div className={styles.vignette} aria-hidden />
      <div className={styles.sparkles} aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={styles.spark} style={{ ['--i' as string]: i }} />
        ))}
      </div>

      <div className={styles.stage}>
        <div className={styles.glow} aria-hidden />
        <img
          className={styles.logo}
          src={logoSrc}
          alt="Zee9"
          width={220}
          height={238}
          decoding="async"
          fetchPriority="high"
          draggable={false}
          onError={() => setLogoSrc(ZEE9_LOGO_PNG)}
        />
        <div className={styles.pulseRing} aria-hidden />
      </div>

      <div className={styles.meta}>
        <p className={styles.title}>{title}</p>
        <p className={styles.sub}>{subtitle}</p>
        <div className={styles.track} aria-hidden>
          <div className={styles.fill} style={{ width: `${Math.max(6, pct)}%` }} />
          <div className={styles.shine} />
        </div>
        <p className={styles.pct}>{pct < 100 ? `${pct}%` : 'Ready'}</p>
      </div>
    </div>
  )
}
