import { useEffect, useRef } from 'react'
import { CHAR, SCENE } from '../constants/assetManifest'
import { playTigerIdle, playTigerWin, type TimelineHandle } from '../animations/timelines'
import styles from './TigerCharacter.module.css'

type Props = {
  mode?: 'idle' | 'betting' | 'winner' | 'losing'
  variant?: 'header' | 'stage'
  reducedMotion?: boolean
}

/** Header portrait, or single soft win-pose leaping from fire. */
export default function TigerCharacter({
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
        handleRef.current = playTigerWin(el, undefined, reducedMotion)
      })
      return () => {
        cancelAnimationFrame(id)
        handleRef.current?.kill()
        handleRef.current = null
      }
    }

    if (mode === 'idle' || mode === 'betting') {
      handleRef.current = playTigerIdle(el, reducedMotion)
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
          data-layer="smoke-back"
          className={`${styles.layer} ${styles.smokeBack}`}
          src={CHAR.tiger.smokeBack}
          alt=""
          draggable={false}
        />
        <img
          data-layer="win-pose"
          className={`${styles.layer} ${styles.winPose}`}
          src={CHAR.tiger.winPose}
          alt=""
          draggable={false}
        />
        <img
          data-layer="smoke-front"
          className={`${styles.layer} ${styles.smokeFront}`}
          src={CHAR.tiger.smokeFront}
          alt=""
          draggable={false}
        />
        <div data-layer="sparks" className={styles.sparks}>
          <img src={SCENE.particleEmber} alt="" />
          <img src={SCENE.particleGold} alt="" />
          <img src={SCENE.particleEmber} alt="" />
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className={cls} aria-hidden>
      <img data-layer="base" className={`${styles.layer} ${styles.base}`} src={CHAR.tiger.base} alt="" draggable={false} />
    </div>
  )
}
