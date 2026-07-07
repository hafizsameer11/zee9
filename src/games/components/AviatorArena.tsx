import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  curveTangentAngle,
  multiplierToProgress,
  pointOnAviatorCurve,
  sampleAviatorCurve,
  VIEW_H,
  VIEW_W,
} from '../engines/aviatorCurve'
import { AviatorPlaneIcon } from './aviatorClassicGfx'
import styles from './aviatorGame.module.css'

type Phase = 'idle' | 'flying' | 'crashed'

type Props = {
  mult: number
  phase: Phase
  elapsedSec: number
}

const PAD = { l: 28, r: 12, t: 12, b: 22 }

function mapPoint(p: { x: number; y: number }, w: number, h: number) {
  const gw = w - PAD.l - PAD.r
  const gh = h - PAD.t - PAD.b
  return {
    x: PAD.l + (p.x / VIEW_W) * gw,
    y: PAD.t + (p.y / VIEW_H) * gh,
  }
}

function bgClass(mult: number, phase: Phase) {
  if (phase === 'idle') return styles.arenaBgIdle
  if (mult >= 10) return styles.arenaBgPink
  if (mult >= 2) return styles.arenaBgPurple
  return styles.arenaBgBlue
}

export default function AviatorArena({ mult, phase, elapsedSec }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 400, h: 200 })
  const [planeFrame, setPlaneFrame] = useState(0)

  const flying = phase === 'flying'
  const crashed = phase === 'crashed'
  const active = flying || crashed
  const progress = active ? Math.max(multiplierToProgress(mult), flying ? 0.02 : 0) : 0

  useEffect(() => {
    if (!flying) return
    const id = setInterval(() => setPlaneFrame((f) => f + 1), 250)
    return () => clearInterval(id)
  }, [flying])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const { w, h } = size
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const bottomY = h - PAD.b
    const leftX = PAD.l

    // Axis guide dots
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    for (let i = 0; i < 8; i++) {
      const y = PAD.t + ((h - PAD.t - PAD.b) * i) / 7
      ctx.beginPath()
      ctx.arc(leftX - 10, y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
    const xSteps = 10
    for (let i = 0; i <= xSteps; i++) {
      const x = PAD.l + ((w - PAD.l - PAD.r) * i) / xSteps
      ctx.beginPath()
      ctx.arc(x, bottomY + 10, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Time axis labels
    const windowStart = elapsedSec > 8 ? Math.floor(elapsedSec - 8) : 0
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = '600 10px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ;[0, 2, 4, 6, 8].forEach((step, i) => {
      const x = PAD.l + ((w - PAD.l - PAD.r) * i) / 4
      ctx.fillText(`${windowStart + step}s`, x, h - 4)
    })

    if (!active || progress <= 0) return

    const pts = sampleAviatorCurve(progress).map((p) => mapPoint(p, w, h))
    const tip = mapPoint(pointOnAviatorCurve(progress), w, h)
    const origin = mapPoint(pointOnAviatorCurve(0), w, h)

    // Filled area under curve
    const fillGrad = ctx.createLinearGradient(0, PAD.t, 0, bottomY)
    fillGrad.addColorStop(0, 'rgba(233, 21, 45, 0.55)')
    fillGrad.addColorStop(1, 'rgba(233, 21, 45, 0.12)')
    ctx.beginPath()
    ctx.moveTo(origin.x, bottomY)
    ctx.lineTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.lineTo(tip.x, bottomY)
    ctx.closePath()
    ctx.fillStyle = fillGrad
    ctx.fill()

    // Curve stroke
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.strokeStyle = '#e9152d'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowColor = 'rgba(233, 21, 45, 0.6)'
    ctx.shadowBlur = 8
    ctx.stroke()
    ctx.shadowBlur = 0

    // Store tip for plane overlay via data attribute
    canvas.dataset.tipX = String(tip.x)
    canvas.dataset.tipY = String(tip.y)
    canvas.dataset.tipAngle = String(curveTangentAngle(progress))
  }, [active, progress, size, elapsedSec])

  const tip = active
    ? mapPoint(pointOnAviatorCurve(progress), size.w, size.h)
    : null
  const tipAngle = active ? curveTangentAngle(progress) : 0

  return (
    <div ref={wrapRef} className={`${styles.arena} ${bgClass(mult, phase)}`}>
      <div className={styles.arenaSunburst} />
      <div className={styles.arenaGlow} />
      <canvas ref={canvasRef} className={styles.arenaCanvas} />

      {flying && tip && (
        <div
          className={styles.planeWrap}
          style={{
            left: tip.x,
            top: tip.y,
            transform: `translate(-50%, -50%) rotate(${tipAngle}deg)`,
          }}
        >
          <AviatorPlaneIcon className={styles.planeIcon} frame={planeFrame} />
        </div>
      )}

      {crashed && tip && (
        <div
          className={styles.crashBurst}
          style={{ left: tip.x, top: tip.y }}
          aria-hidden
        />
      )}

      <div className={styles.multiplierBlock}>
        <span
          className={`${styles.multiplier} ${flying ? styles.multiplierLive : ''} ${crashed ? styles.multiplierCrash : ''}`}
        >
          {mult.toFixed(2)}x
        </span>
        {flying && <span className={styles.multiplierSub}>Flying</span>}
        {crashed && <span className={styles.multiplierSub}>Crashed!</span>}
        {phase === 'idle' && <span className={styles.multiplierSub}>Place your bet</span>}
      </div>
    </div>
  )
}
