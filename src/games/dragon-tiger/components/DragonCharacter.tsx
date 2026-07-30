import { useEffect, useRef } from 'react'
import { CHAR, SCENE } from '../constants/assetManifest'
import { playDragonIdle, playDragonWin, type TimelineHandle } from '../animations/timelines'
import styles from './DragonCharacter.module.css'

type Props = {
  mode?: 'idle' | 'betting' | 'winner' | 'losing'
  variant?: 'header' | 'stage'
  reducedMotion?: boolean
}

/** Header portrait, or single soft win-pose emerging from mist. */
export default function DragonCharacter({
  mode = 'idle',
  variant = 'header',
  reducedMotion = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<TimelineHandle | null>(null)

  useEffect(() => {
    handleRef.current?.kill()
    handleRef.current = null
    const el = rootRef.current
    if (!el) return

    if (mode === 'winner' && variant === 'stage') {
      const id = requestAnimationFrame(() => {
        handleRef.current = playDragonWin(el, undefined, reducedMotion)
      })
      return () => {
        cancelAnimationFrame(id)
        handleRef.current?.kill()
        handleRef.current = null
      }
    }

    if (mode === 'idle' || mode === 'betting') {
      handleRef.current = playDragonIdle(el, reducedMotion)
    }

    return () => {
      handleRef.current?.kill()
      handleRef.current = null
    }
  }, [mode, variant, reducedMotion])

  const cls = [
    styles.root,
    styles[variant],
    styles[mode],
    reducedMotion ? styles.reduced : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (variant === 'stage' && mode === 'winner') {
    return (
      <div ref={rootRef} className={cls} aria-hidden>
        <div data-layer="bloom" className={styles.bloom} />
        <img
          data-layer="mist-back"
          className={`${styles.layer} ${styles.mistBack}`}
          src={CHAR.dragon.mistBack}
          alt=""
          draggable={false}
        />
        <img
          data-layer="win-pose"
          className={`${styles.layer} ${styles.winPose}`}
          src={CHAR.dragon.winPose}
          alt=""
          draggable={false}
        />
        <img
          data-layer="mist-front"
          className={`${styles.layer} ${styles.mistFront}`}
          src={CHAR.dragon.mistFront}
          alt=""
          draggable={false}
        />
        <div data-layer="sparks" className={styles.sparks}>
          <img src={SCENE.particleCyan} alt="" />
          <img src={SCENE.particleGold} alt="" />
          <img src={SCENE.particleCyan} alt="" />
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className={cls} aria-hidden>
      <img data-layer="base" className={`${styles.layer} ${styles.base}`} src={CHAR.dragon.base} alt="" draggable={false} />
    </div>
  )
}
