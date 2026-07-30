import { useEffect, useRef } from 'react'
import styles from './GameCanvas.module.css'
import { ChickenRoadScene } from '../scene/ChickenRoadScene'
import type { DifficultyId } from '../constants/gameConfig'
import type { StepResult } from '../services/chickenRoadGameService'

export type SceneHandle = {
  playStepResult: (result: StepResult) => Promise<void>
  celebrate: () => Promise<void>
  resetRound: (options: {
    difficulty: DifficultyId
    laneCount: number
    multipliers: number[]
  }) => void
  setCurrentStep: (step: number) => void
  syncToStep: (step: number) => void
  setTrafficPaused: (paused: boolean) => void
  destroy: () => void
}

type Props = {
  width: number
  height: number
  difficulty: DifficultyId
  laneCount: number
  multipliers: number[]
  onReady?: (handle: SceneHandle) => void
}

export default function GameCanvas(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onReadyRef = useRef(props.onReady)
  onReadyRef.current = props.onReady

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    let scene: ChickenRoadScene | null = null

    void ChickenRoadScene.create({ ...props, canvas }).then((created) => {
      scene = created
      if (cancelled) {
        created.destroy()
        return
      }
      onReadyRef.current?.({
        playStepResult: (result) => created.playStepResult(result),
        celebrate: () => created.celebrate(),
        resetRound: (options) => created.setRoundConfig(options),
        setCurrentStep: (step) => created.setCurrentStep(step),
        syncToStep: (step) => created.syncToStep(step),
        setTrafficPaused: (paused) => created.setTrafficPaused(paused),
        destroy: () => created.destroy(),
      })
    })

    return () => {
      cancelled = true
      scene?.destroy()
    }
    // The scene is configured through its imperative handle after creation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Chicken Road game" />
    </div>
  )
}
