import styles from '../styles/carRoulette.module.css'
import { ASSET } from '../constants/gameConfig'

type Props = { paused?: boolean }

export default function SceneBackground({ paused }: Props) {
  return (
    <>
      <div
        className={`${styles.bg} ${paused ? '' : styles.bgDrift}`}
        style={{ backgroundImage: `url(${ASSET.bg})` }}
        aria-hidden
      />
      {!paused && <div className={styles.particles} aria-hidden />}
    </>
  )
}
