import { SCENE } from '../constants/assetManifest'
import styles from './SceneBackground.module.css'

/** Lighter casino salon environment — soft gold wash, no side color blobs. */
export default function SceneBackground({ paused = false }: { paused?: boolean }) {
  return (
    <div className={`${styles.root} ${paused ? styles.paused : ''}`} aria-hidden>
      <div className={`${styles.layer} ${styles.base}`} style={{ backgroundImage: `url(${SCENE.bgBase})` }} />
      <div className={`${styles.layer} ${styles.temple}`} style={{ backgroundImage: `url(${SCENE.bgTemple})` }} />
      <div className={styles.casinoWash} />
      <div className={`${styles.layer} ${styles.atmosphere}`} style={{ backgroundImage: `url(${SCENE.bgAtmosphere})` }} />
      <div className={styles.ornamentClouds} />
      <div className={styles.particles} />
      <div className={`${styles.layer} ${styles.platform}`} style={{ backgroundImage: `url(${SCENE.bgPlatform})` }} />
      <div className={styles.vignette} />
    </div>
  )
}
