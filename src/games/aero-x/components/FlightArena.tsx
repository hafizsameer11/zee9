import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CHAR, ENV, FX } from '../constants/assetManifest'
import { CHAR_DISPLAY, multAt, type CharPose, type RoundPhase } from '../constants/gameConfig'
import styles from '../styles/aeroX.module.css'

type Props = {
  phase: RoundPhase
  mult: number
  waitProgress: number
  flightStart: number | null
  crashPoint: number
}

type Pt = { x: number; y: number }

const PAD = { l: 36, r: 22, t: 14, b: 16 }

const POSE_SRC: Record<CharPose, string> = {
  idle: CHAR.idle,
  prep: CHAR.prep,
  run: CHAR.run,
  fly: CHAR.fly,
  accel: CHAR.accel,
  away: CHAR.away,
}

/** Soft parallax layers — unique assets, different depth/speed/scale. */
const CLOUD_LAYERS = [
  { img: 0, x: 0.08, y: 0.16, s: 1.05, speed: 0.16, a: 0.34 },
  { img: 1, x: 0.42, y: 0.1, s: 1.2, speed: 0.1, a: 0.28 },
  { img: 2, x: 0.72, y: 0.2, s: 0.75, speed: 0.07, a: 0.22 },
  { img: 3, x: 0.28, y: 0.36, s: 1.3, speed: 0.2, a: 0.32 },
  { img: 4, x: 0.58, y: 0.46, s: 0.9, speed: 0.26, a: 0.36 },
  { img: 5, x: 0.88, y: 0.3, s: 0.95, speed: 0.13, a: 0.26 },
  { img: 1, x: 0.15, y: 0.54, s: 0.7, speed: 0.3, a: 0.18 },
  { img: 3, x: 0.78, y: 0.56, s: 0.8, speed: 0.09, a: 0.16 },
]

export default function FlightArena({
  phase,
  mult,
  waitProgress,
  flightStart,
  crashPoint,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const charRef = useRef<HTMLImageElement>(null)
  const liveMultEl = useRef<HTMLDivElement>(null)
  const phaseRef = useRef(phase)
  const multRefVal = useRef(mult)
  const waitRef = useRef(waitProgress)
  const flightRef = useRef(flightStart)
  const crashRef = useRef(crashPoint)
  const poseRef = useRef<CharPose>('idle')
  const crashAnimT0 = useRef(0)
  const [size, setSize] = useState({ w: 800, h: 200 })
  const axisMax = useRef({ t: 8, m: 2 })
  const particles = useRef<
    { x: number; y: number; life: number; vx: number; vy: number; s: number; warm: number }[]
  >([])
  const ambience = useRef<{ x: number; y: number; s: number; a: number; vy: number }[]>([])
  const cloudOff = useRef(0)
  const launchT0 = useRef(0)
  const cloudImgs = useRef<HTMLImageElement[]>([])
  const tipSnap = useRef<Pt | null>(null)

  useEffect(() => {
    cloudImgs.current = ENV.clouds.map((src) => {
      const im = new Image()
      im.decoding = 'async'
      im.src = src
      return im
    })
    // seed ambient dust once
    if (!ambience.current.length) {
      for (let i = 0; i < 28; i++) {
        ambience.current.push({
          x: Math.random(),
          y: Math.random(),
          s: 0.6 + Math.random() * 1.8,
          a: 0.08 + Math.random() * 0.18,
          vy: 0.00002 + Math.random() * 0.00006,
        })
      }
    }
  }, [])

  phaseRef.current = phase
  multRefVal.current = mult
  waitRef.current = waitProgress
  flightRef.current = flightStart
  crashRef.current = crashPoint

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w > 0 && h > 0) setSize((p) => (p.w === w && p.h === h ? p : { w, h }))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (phase === 'waiting' || phase === 'loading') {
      axisMax.current = { t: 8, m: 2 }
      particles.current = []
      tipSnap.current = null
    }
    if (phase === 'launching') launchT0.current = performance.now()
    if (phase === 'flewAway') crashAnimT0.current = performance.now()
  }, [phase])

  useEffect(() => {
    let raf = 0
    const loop = (now: number) => {
      const canvas = canvasRef.current
      if (!canvas) {
        raf = requestAnimationFrame(loop)
        return
      }
      const { w, h } = size
      if (w <= 0 || h <= 0) {
        raf = requestAnimationFrame(loop)
        return
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        raf = requestAnimationFrame(loop)
        return
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const phaseNow = phaseRef.current
      const multNow = multRefVal.current
      const waitNow = waitRef.current
      const flightStartNow = flightRef.current
      const crashNow = crashRef.current

      cloudOff.current += 0.008
      drawParallaxClouds(ctx, w, h, cloudOff.current, cloudImgs.current)
      drawAmbience(ctx, w, h, ambience.current, now)

      const flying = phaseNow === 'flying' || phaseNow === 'launching'
      const crashed = phaseNow === 'flewAway'
      let tip: Pt | null = null
      let angle = -14
      let launchProg = 0

      if (phaseNow === 'launching') {
        launchProg = Math.min(1, (now - launchT0.current) / 700)
      }

      if (flying || crashed) {
        const start = flightStartNow ?? now
        const elapsed = Math.max(0, (now - start) / 1000)
        const smooth =
          phaseNow === 'launching'
            ? 1 + launchProg * 0.015
            : Math.min(multAt(elapsed * 1000), crashNow)

        const gw = w - PAD.l - PAD.r
        const gh = h - PAD.t - PAD.b
        const bottomY = h - PAD.b
        const leftX = PAD.l

        // Moderate headroom: early path stays low, but visibly climbs (not a flat chart line)
        const wantT = Math.max(6.5, elapsed * 1.28)
        const wantM = Math.max(2.2, smooth * 1.32)
        if (wantT > axisMax.current.t) axisMax.current.t = wantT
        if (wantM > axisMax.current.m) axisMax.current.m = wantM
        const tMax = axisMax.current.t
        const mMax = axisMax.current.m

        const toXY = (t: number, m: number): Pt => {
          const tx = Math.min(t, tMax) / tMax
          const xe = Math.pow(tx, 1.08)
          const mr = Math.max(0, (Math.min(m, mMax) - 1) / Math.max(0.01, mMax - 1))
          // Mild ease-in: starts gently, steepens as mult grows
          const ye = Math.pow(mr, 1.32)
          return {
            x: leftX + xe * gw,
            y: bottomY - ye * gh,
          }
        }

        const steps = Math.max(28, Math.min(180, Math.ceil(elapsed * 42) + 2))
        const pts: Pt[] = []
        for (let i = 0; i <= steps; i++) {
          const t = (elapsed * i) / steps
          const m = Math.min(multAt(t * 1000), crashNow)
          pts.push(toXY(t, Math.max(1, m)))
        }
        tip = pts[pts.length - 1] ?? toXY(0, 1)
        tipSnap.current = tip

        if (phaseNow !== 'flewAway') {
          // Wide translucent under-fill
          const fill = ctx.createLinearGradient(0, PAD.t, 0, bottomY)
          fill.addColorStop(0, 'rgba(255,130,35,0.5)')
          fill.addColorStop(0.4, 'rgba(230,95,18,0.28)')
          fill.addColorStop(1, 'rgba(40,12,4,0.04)')
          ctx.beginPath()
          ctx.moveTo(pts[0]!.x, bottomY)
          smoothPath(ctx, pts)
          ctx.lineTo(tip.x, bottomY)
          ctx.closePath()
          ctx.fillStyle = fill
          ctx.fill()

          // Outer glow stroke
          ctx.beginPath()
          smoothPath(ctx, pts)
          ctx.strokeStyle = 'rgba(255,140,40,0.38)'
          ctx.lineWidth = 14
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.stroke()

          // Mid glow
          ctx.beginPath()
          smoothPath(ctx, pts)
          ctx.strokeStyle = 'rgba(255,165,55,0.7)'
          ctx.lineWidth = 6.5
          ctx.stroke()

          // Sharp inner orange edge
          ctx.beginPath()
          smoothPath(ctx, pts)
          ctx.strokeStyle = '#ffb040'
          ctx.lineWidth = 2.8
          ctx.stroke()

          // Bright tip
          const tipGlow = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 14)
          tipGlow.addColorStop(0, 'rgba(255,230,160,0.85)')
          tipGlow.addColorStop(0.4, 'rgba(255,140,40,0.35)')
          tipGlow.addColorStop(1, 'rgba(255,100,20,0)')
          ctx.fillStyle = tipGlow
          ctx.beginPath()
          ctx.arc(tip.x, tip.y, 14, 0, Math.PI * 2)
          ctx.fill()

          if (phaseNow === 'flying' && Math.random() < 0.7) {
            particles.current.push({
              x: tip.x - 6 - Math.random() * 10,
              y: tip.y + 2 + Math.random() * 6,
              life: 1,
              vx: -0.8 - Math.random() * 1.6,
              vy: 0.35 + Math.random() * 1.1,
              s: 3 + Math.random() * 9,
              warm: 0.7 + Math.random() * 0.3,
            })
          }
        } else if (particles.current.length < 14 && Math.random() < 0.4) {
          const base = tipSnap.current ?? tip
          particles.current.push({
            x: base.x + Math.random() * 60,
            y: base.y + Math.random() * 28 - 14,
            life: 0.8,
            vx: 1.6 + Math.random() * 1.4,
            vy: -1.1 - Math.random(),
            s: 5 + Math.random() * 12,
            warm: 1,
          })
        }

        if (pts.length >= 2) {
          const a = pts[pts.length - 2]!
          angle = (Math.atan2(tip.y - a.y, tip.x - a.x) * 180) / Math.PI
        }

        if (phaseNow === 'launching') {
          const gx = PAD.l + 10 + launchProg * 48
          const gy = bottomY - 4
          tip = {
            x: gx + launchProg * (tip.x - gx),
            y: gy + launchProg * (tip.y - gy),
          }
          angle = -8 - launchProg * 14
          // takeoff burst
          if (launchProg > 0.55 && launchProg < 0.85 && Math.random() < 0.5) {
            particles.current.push({
              x: tip.x - 4,
              y: tip.y + 8,
              life: 0.9,
              vx: -1.2 - Math.random(),
              vy: -0.2 + Math.random(),
              s: 6 + Math.random() * 10,
              warm: 1,
            })
          }
        }
      }

      particles.current = particles.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.022,
          s: p.s * 0.988,
        }))
        .filter((p) => p.life > 0)
      for (const p of particles.current) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 0.55)
        g.addColorStop(0, `rgba(255,${Math.floor(180 * p.warm)},60,${p.life * 0.7})`)
        g.addColorStop(1, `rgba(255,80,20,0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.s * 0.55, 0, Math.PI * 2)
        ctx.fill()
      }

      let nextPose: CharPose = 'idle'
      if (phaseNow === 'flewAway') nextPose = crashNow >= 2 ? 'away' : 'accel'
      else if (phaseNow === 'launching') nextPose = launchProg < 0.5 ? 'run' : 'fly'
      else if (phaseNow === 'waiting') nextPose = waitNow > 0.68 ? 'prep' : 'idle'
      else if (phaseNow === 'flying') nextPose = multNow > crashNow * 0.7 ? 'accel' : 'fly'

      const img = charRef.current
      if (img) {
        if (poseRef.current !== nextPose) {
          poseRef.current = nextPose
          img.src = POSE_SRC[nextPose]
        }
        if (phaseNow === 'waiting' || phaseNow === 'loading') {
          const bob = Math.sin(now / 400) * 2.4
          const breathe = 1 + Math.sin(now / 650) * 0.02
          const lean = -4 + (waitNow > 0.68 ? -6 : 0)
          img.style.display = 'block'
          img.style.opacity = '1'
          img.style.filter =
            'drop-shadow(0 3px 8px rgba(0,0,0,0.55)) drop-shadow(0 0 12px rgba(255,120,30,0.32))'
          const cx = PAD.l + 18
          const cy = h - PAD.b - 58 + bob
          ctx.save()
          ctx.fillStyle = 'rgba(0,0,0,0.45)'
          ctx.beginPath()
          ctx.ellipse(cx + 6, h - PAD.b + 2, 28, 7, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
          img.style.transform = `translate(${cx}px, ${cy}px) translate(-42%, -72%) scale(${breathe}) rotate(${lean}deg)`
          if (liveMultEl.current) liveMultEl.current.style.opacity = '0'
        } else if (tip) {
          img.style.display = 'block'
          let x = tip.x
          let y = tip.y
          let sc = 1
          let ang = angle
          let opacity = 1
          if (phaseNow === 'flewAway') {
            const t = Math.min(1, (now - crashAnimT0.current) / 680)
            x = tip.x + t * 200
            y = tip.y - t * 110
            sc = 1 + t * 0.25
            ang = angle - t * 14
            opacity = Math.max(0, 1 - t * 1.08)
            img.style.filter =
              'drop-shadow(0 0 12px rgba(255,140,40,0.55)) blur(' + t * 1.2 + 'px)'
          } else {
            img.style.filter =
              'drop-shadow(0 2px 6px rgba(0,0,0,0.5)) drop-shadow(-6px 2px 10px rgba(255,120,30,0.45))'
          }
          img.style.opacity = String(opacity)
          img.style.transform = `translate(${x}px, ${y}px) translate(-40%, -58%) rotate(${ang}deg) scale(${sc})`

          // Multiplier sits left of character, tracking tip
          if (liveMultEl.current && (phaseNow === 'flying' || phaseNow === 'launching')) {
            liveMultEl.current.style.opacity = '1'
            liveMultEl.current.textContent = `${Math.max(1, multNow).toFixed(2)}x`
            const mx = Math.max(86, tip.x - 92)
            const my = Math.max(34, tip.y - 42)
            liveMultEl.current.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`
          }
        } else {
          img.style.display = 'none'
          if (liveMultEl.current) liveMultEl.current.style.opacity = '0'
        }
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [size])

  return (
    <div ref={wrapRef} className={styles.arena}>
      <div className={styles.arenaBg} style={{ backgroundImage: `url(${ENV.bg})` }} />
      <div className={styles.arenaVignette} />
      <canvas ref={canvasRef} className={styles.arenaCanvas} />
      <img
        ref={charRef}
        className={styles.character}
        src={POSE_SRC.idle}
        alt=""
        draggable={false}
        style={{ width: CHAR_DISPLAY, height: CHAR_DISPLAY }}
      />

      {(phase === 'flying' || phase === 'launching') && (
        <div ref={liveMultEl} className={styles.multLive}>
          {mult.toFixed(2)}x
        </div>
      )}

      {phase === 'waiting' && (
        <div className={styles.waitOverlay}>
          <div className={styles.waitTitle}>WAITING FOR THE NEXT ROUND</div>
          <div className={styles.waitTrack}>
            <div className={styles.waitFill} style={{ width: `${waitProgress * 100}%` }} />
          </div>
        </div>
      )}

      {phase === 'flewAway' && (
        <div className={styles.flewAway}>
          <div className={styles.flewLabel}>FLEW AWAY!</div>
          <div className={styles.flewMult}>{crashPoint.toFixed(2)}x</div>
        </div>
      )}

      <div className={styles.preload} aria-hidden>
        {Object.values(POSE_SRC).map((src) => (
          <img key={src} src={src} alt="" />
        ))}
        {ENV.clouds.map((src) => (
          <img key={src} src={src} alt="" />
        ))}
        {FX.particles.map((src) => (
          <img key={src} src={src} alt="" />
        ))}
      </div>
    </div>
  )
}

function smoothPath(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  if (!pts.length) return
  ctx.moveTo(pts[0]!.x, pts[0]!.y)
  if (pts.length === 2) {
    ctx.lineTo(pts[1]!.x, pts[1]!.y)
    return
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i]!
    const p1 = pts[i + 1]!
    const mx = (p0.x + p1.x) / 2
    const my = (p0.y + p1.y) / 2
    ctx.quadraticCurveTo(p0.x, p0.y, mx, my)
  }
  const last = pts[pts.length - 1]!
  const prev = pts[pts.length - 2]!
  ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y)
}

function drawParallaxClouds(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  off: number,
  imgs: HTMLImageElement[],
) {
  for (const c of CLOUD_LAYERS) {
    const im = imgs[c.img % Math.max(1, imgs.length)]
    if (!im || !im.complete || im.naturalWidth <= 0) continue
    const span = w + 200
    const x = ((c.x * w + off * c.speed * 55) % span) - 100
    const y = c.y * h
    const tw = 110 * c.s
    const th = (im.naturalHeight / im.naturalWidth) * tw
    ctx.save()
    ctx.globalAlpha = c.a
    ctx.drawImage(im, x - tw / 2, y - th / 2, tw, th)
    ctx.restore()
  }
}

function drawAmbience(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dots: { x: number; y: number; s: number; a: number; vy: number }[],
  now: number,
) {
  for (const d of dots) {
    d.y -= d.vy * 16
    if (d.y < -0.02) d.y = 1.02
    const pulse = 0.7 + 0.3 * Math.sin(now / 900 + d.x * 10)
    ctx.beginPath()
    ctx.fillStyle = `rgba(160,190,255,${d.a * pulse})`
    ctx.arc(d.x * w, d.y * h, d.s, 0, Math.PI * 2)
    ctx.fill()
  }
}
