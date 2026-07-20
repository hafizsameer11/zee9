import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { multiplierAtElapsed, multiplierAtElapsedSmooth } from '../engines/crash'
import styles from './aviatorGame.module.css'

type Phase = 'waiting' | 'flying' | 'crashed' | 'idle'

type Props = {
  /** Discrete mult from parent (used when not flying / for crash snap). */
  mult: number
  phase: Phase
  elapsedSec: number
  waitingMsLeft?: number
  /** performance.now() when flight started (client-aligned). Enables local RAF. */
  flightStartPerf?: number | null
  /** Optional hard cap (crash point) while flying. */
  crashCap?: number | null
  /** Notify parent of discrete mult ~10x/sec for cashout UI. */
  onFlightMult?: (mult: number, elapsedSec: number) => void
}

const PAD = { l: 36, r: 14, t: 16, b: 26 }

function bgClass(mult: number, phase: Phase) {
  if (phase === 'waiting' || phase === 'idle') return styles.arenaBgIdle
  if (mult >= 10) return styles.arenaBgPink
  if (mult >= 2) return styles.arenaBgPurple
  return styles.arenaBgBlue
}

type Pt = { t: number; m: number }

export default function AviatorArena({
  mult,
  phase,
  elapsedSec,
  waitingMsLeft = 0,
  flightStartPerf = null,
  crashCap = null,
  onFlightMult,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const multElRef = useRef<HTMLSpanElement>(null)
  const trailRef = useRef<Pt[]>([{ t: 0, m: 1 }])
  const tipRef = useRef<{ x: number; y: number; angle: number } | null>(null)
  const planeRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)
  const lastNotifyRef = useRef(0)
  const onFlightMultRef = useRef(onFlightMult)
  onFlightMultRef.current = onFlightMult

  const [size, setSize] = useState({ w: 400, h: 200 })
  const [tip, setTip] = useState<{ x: number; y: number; angle: number } | null>(null)
  const [bgMult, setBgMult] = useState(mult)
  const axisMaxRef = useRef({ t: 8, m: 2 })

  const flying = phase === 'flying'
  const crashed = phase === 'crashed'
  const active = flying || crashed

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

  useEffect(() => {
    if (phase === 'waiting' || phase === 'idle') {
      trailRef.current = [{ t: 0, m: 1 }]
      tipRef.current = null
      axisMaxRef.current = { t: 8, m: 2 }
      setTip(null)
      setBgMult(1)
      if (multElRef.current) multElRef.current.textContent = '1.00x'
    }
  }, [phase])

  const drawFrame = (
    elapsed: number,
    smoothMult: number,
    discreteMult: number,
    isActive: boolean,
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const { w, h } = size
    if (w <= 0 || h <= 0) return

    // Avoid resetting canvas buffer every frame (causes flicker / GC) — only when size/dpr changes
    const needResize =
      canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)
    if (needResize) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const gw = w - PAD.l - PAD.r
    const gh = h - PAD.t - PAD.b
    const bottomY = h - PAD.b
    const leftX = PAD.l

    // Monotonic axis maxima so the curve doesn't rescale-jitter every frame
    const wantT = Math.max(8, elapsed * 1.15)
    const wantM = Math.max(2, smoothMult * 1.25)
    if (wantT > axisMaxRef.current.t) axisMaxRef.current.t = wantT
    if (wantM > axisMaxRef.current.m) axisMaxRef.current.m = wantM
    const tMax = axisMaxRef.current.t
    const mMax = axisMaxRef.current.m

    const toXY = (t: number, m: number) => ({
      x: leftX + (Math.min(t, tMax) / tMax) * gw,
      y: bottomY - ((Math.min(m, mMax) - 1) / (mMax - 1)) * gh,
    })

    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(leftX, PAD.t)
    ctx.lineTo(leftX, bottomY)
    ctx.lineTo(w - PAD.r, bottomY)
    ctx.stroke()

    ctx.font = '600 10px Inter, system-ui, sans-serif'
    ctx.textAlign = 'right'
    const yTicks = 5
    for (let i = 0; i <= yTicks; i++) {
      const mVal = 1 + ((mMax - 1) * i) / yTicks
      const y = bottomY - (i / yTicks) * gh
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.moveTo(leftX, y)
      ctx.lineTo(w - PAD.r, y)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.fillText(`${mVal.toFixed(2)}x`, leftX - 6, y + 3)
    }

    ctx.textAlign = 'center'
    const xTicks = 5
    for (let i = 0; i <= xTicks; i++) {
      const tVal = (tMax * i) / xTicks
      const x = leftX + (i / xTicks) * gw
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillText(`${tVal.toFixed(1)}s`, x, h - 6)
      ctx.beginPath()
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.arc(x, bottomY + 2, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    if (!isActive) {
      tipRef.current = null
      if (planeRef.current) planeRef.current.style.display = 'none'
      return
    }

    // Rebuild full curve from origin every frame — never drop the start of the path
    const cap = crashCap != null ? crashCap : Number.POSITIVE_INFINITY
    const steps = Math.max(24, Math.min(180, Math.ceil(elapsed * 40) + 1))
    const samples: Pt[] = [{ t: 0, m: 1 }]
    for (let i = 1; i <= steps; i++) {
      const t = (elapsed * i) / steps
      const m = Math.min(multiplierAtElapsedSmooth(t * 1000), cap)
      samples.push({ t, m: Math.max(1, m) })
    }
    // Ensure tip matches live values exactly
    samples[samples.length - 1] = { t: elapsed, m: Math.max(1, Math.min(smoothMult, cap)) }
    trailRef.current = samples

    const pts = samples.map((p) => toXY(p.t, p.m))
    if (pts.length < 2) return
    const tipPt = pts[pts.length - 1]!
    const origin = pts[0]!

    const fillGrad = ctx.createLinearGradient(0, PAD.t, 0, bottomY)
    fillGrad.addColorStop(0, 'rgba(233, 21, 45, 0.55)')
    fillGrad.addColorStop(1, 'rgba(233, 21, 45, 0.08)')
    ctx.beginPath()
    ctx.moveTo(origin.x, bottomY)
    ctx.lineTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.lineTo(tipPt.x, bottomY)
    ctx.closePath()
    ctx.fillStyle = fillGrad
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.strokeStyle = '#e9152d'
    ctx.lineWidth = 3.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowColor = 'rgba(233, 21, 45, 0.65)'
    ctx.shadowBlur = 10
    ctx.stroke()
    ctx.shadowBlur = 0

    ctx.beginPath()
    ctx.arc(tipPt.x, tipPt.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()

    const a = pts[Math.max(0, pts.length - 2)]!
    const angle = (Math.atan2(tipPt.y - a.y, tipPt.x - a.x) * 180) / Math.PI
    tipRef.current = { x: tipPt.x, y: tipPt.y, angle }

    if (planeRef.current) {
      planeRef.current.style.display = 'flex'
      planeRef.current.style.transform = `translate(${tipPt.x}px, ${tipPt.y}px) translate(-35%, -55%) rotate(${angle}deg)`
    }

    if (multElRef.current) {
      multElRef.current.textContent = `${discreteMult.toFixed(2)}x`
    }
  }

  // Local RAF while flying — plane + curve + label without React 60fps re-renders
  useEffect(() => {
    if (phase !== 'flying' || flightStartPerf == null) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
      return
    }

    const tick = () => {
      const elapsedMs = Math.max(0, performance.now() - flightStartPerf)
      const elapsed = elapsedMs / 1000
      let smooth = multiplierAtElapsedSmooth(elapsedMs)
      let discrete = multiplierAtElapsed(elapsedMs)
      if (crashCap != null) {
        smooth = Math.min(smooth, crashCap)
        discrete = Math.min(discrete, crashCap)
      }

      drawFrame(elapsed, smooth, discrete, true)

      const now = performance.now()
      if (now - lastNotifyRef.current > 80) {
        lastNotifyRef.current = now
        onFlightMultRef.current?.(discrete, elapsed)
        setBgMult(discrete)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    // size changes need redraw path via next tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, flightStartPerf, crashCap, size.w, size.h])

  // Static / crashed draw from parent props
  useLayoutEffect(() => {
    if (phase === 'flying' && flightStartPerf != null) return
    if (phase === 'waiting' || phase === 'idle') {
      drawFrame(0, 1, 1, false)
      return
    }
    // crashed (or flying without start — fallback)
    const smooth = Math.max(1, mult)
    drawFrame(elapsedSec, smooth, mult, active)
    setTip(tipRef.current)
    setBgMult(mult)
    if (multElRef.current) multElRef.current.textContent = `${mult.toFixed(2)}x`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mult, elapsedSec, size.w, size.h, flightStartPerf, active])

  const waitSec = Math.ceil(waitingMsLeft / 1000)

  return (
    <div ref={wrapRef} className={`${styles.arena} ${bgClass(bgMult, phase)}`}>
      <div className={styles.arenaSunburst} />
      <div className={styles.arenaGlow} />
      <canvas ref={canvasRef} className={styles.arenaCanvas} />

      <div
        ref={planeRef}
        className={styles.planeWrap}
        style={{ display: flying ? undefined : 'none' }}
      >
        <img className={styles.planeImg} src="/games/aviator/plane.png" alt="" draggable={false} />
      </div>

      {crashed && tip && (
        <div className={styles.crashBurst} style={{ left: tip.x, top: tip.y }} aria-hidden />
      )}

      <div className={styles.multiplierBlock}>
        <span
          ref={multElRef}
          className={`${styles.multiplier} ${flying ? styles.multiplierLive : ''} ${crashed ? styles.multiplierCrash : ''}`}
        >
          {mult.toFixed(2)}x
        </span>
        {flying && <span className={styles.multiplierSub}>FLYING</span>}
        {crashed && <span className={styles.multiplierSub}>Crashed!</span>}
        {(phase === 'waiting' || phase === 'idle') && (
          <span className={styles.multiplierSub}>
            {waitSec > 0 ? `Next round in ${waitSec}s` : 'Place your bet'}
          </span>
        )}
      </div>
    </div>
  )
}
