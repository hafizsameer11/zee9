import styles from '../styles/zooRoulette.module.css'

type Props = {
  paused?: boolean
}

export default function SceneBackground({ paused }: Props) {
  return (
    <>
      <div
        className={`${styles.bg} ${paused ? '' : styles.bgDrift}`}
        style={{ backgroundImage: `url(/games/zoo-roulette/bg/jungle.webp)` }}
      />
      <div className={`${styles.particles} ${paused ? '' : styles.particlesDrift}`} aria-hidden />
      <div className={styles.vignette} aria-hidden />
    </>
  )
}
