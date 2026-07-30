import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ENV, FX, ROCKET } from '../constants/assetManifest'
import {
  ROCKET_DISPLAY,
  multAt,
  type RocketPose,
  type RoundPhase,
} from '../constants/gameConfig'
import type { LivePlayer } from '../hooks/useAeroXGame'
import styles from '../styles/aeroX.module.css'

type Props = {
  phase: RoundPhase
  mult: number
  waitProgress: number
  waitLeft: number
  flightStart: number | null
  crashPoint: number
  players: LivePlayer[]
}

type Pt = { x: number; y: number }

const PAD = { l: 36, r: 28, t: 44, b: 18 }

const POSE_SRC: Record<RocketPose, string> = {
  idle: ROCKET.idle,
  prep: ROCKET.prep,
  ignition: ROCKET.ignition,
  takeoff: ROCKET.takeoff,
  fly: ROCKET.fly,
  accel: ROCKET.accel,
  away: ROCKET.away,
}

/** Main planets live in the bg art — no extra overlays (avoids clustering). */
const PLANETS: {
  key: 'ringed' | 'volcanic' | 'moon'
  x: number
  y: number
  s: number
  speed: number
  a: number
}[] = []

function multColor(m: number): string {
  if (m < 2) return '#ff5ec0'
  if (m < 5) return '#4aefff'
  if (m < 10) return '#7ef0ff'
  return '#ffd86a'
}

const LAUNCH_FAKE = 1400

export default function FlightArena({
  phase,
  mult,
  waitProgress,
  waitLeft,
  flightStart,
  crashPoint,
  players,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rocketRef = useRef<HTMLImageElement>(null)
  const flameRef = useRef<HTMLDivElement>(null)
  const liveMultEl = useRef<HTMLDivElement>(null)
  const waitUiRef = useRef<HTMLDivElement>(null)
  const phaseRef = useRef(phase)
  const multRefVal = useRef(mult)
  const waitRef = useRef(waitProgress)
  const waitLeftRef = useRef(waitLeft)
  const flightRef = useRef(flightStart)
  const crashRef = useRef(crashPoint)
  const poseRef = useRef<RocketPose>('idle')
  const crashAnimT0 = useRef(0)
  const [size, setSize] = useState({ w: 700, h: 220 })
  const axisMax = useRef({ m: 2.2 })
  const particles = useRef<
    { x: number; y: number; life: number; vx: number; vy: number; s: number; warm: number }[]
  >([])
  const starOff = useRef(0)
  const launchT0 = useRef(0)
  const flameFrame = useRef(0)
  const [floatTags, setFloatTags] = useState<{ name: string; mult: number; x: number; y: number }[]>(
    [],
  )

  const imgs = useRef<{
    bg?: HTMLImageElement
    dust?: HTMLImageElement
    stars: HTMLImageElement[]
    nebulae: HTMLImageElement[]
    planets: Record<string, HTMLImageElement>
  }>({ stars: [], nebulae: [], planets: {} })

  useEffect(() => {
    const load = (src: string) => {
      const im = new Image()
      im.decoding = 'async'
      im.src = src
      return im
    }
    imgs.current.bg = load(ENV.bg)
    imgs.current.dust = load(ENV.dust)
    imgs.current.stars = ENV.stars.map(load)
    imgs.current.nebulae = ENV.nebulae.map(load)
    imgs.current.planets = {
      ringed: load(ENV.planets.ringed),
      volcanic: load(ENV.planets.volcanic),
      ice: load(ENV.planets.ice),
      moon: load(ENV.planets.moon),
    }
  }, [])

  phaseRef.current = phase
  multRefVal.current = mult
  waitRef.current = waitProgress
  waitLeftRef.current = waitLeft
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
      axisMax.current = { m: 2.2 }
      particles.current = []
      setFloatTags([])
    }
    if (phase === 'launching') launchT0.current = performance.now()
    if (phase === 'flewAway') crashAnimT0.current = performance.now()
  }, [phase])

  useEffect(() => {
    if (phase !== 'flying') return
    const cashed = players.filter((p) => p.mult != null && p.cashOut != null)
    if (!cashed.length) return
    setFloatTags((prev) => {
      const known = new Set(prev.map((t) => t.name + t.mult))
      const added = cashed
        .filter((p) => !known.has(p.name + (p.mult ?? 0)))
        .slice(-3)
        .map((p) => ({
          name: p.name,
          mult: p.mult!,
          x: 0.4 + Math.random() * 0.3,
          y: 0.35 + Math.random() * 0.3,
        }))
      if (!added.length) return prev
      return [...prev, ...added].slice(-5)
    })
  }, [players, phase])

  useEffect(() => {
    let raf = 0
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    /**
     * Crash growth curve: nearly flat early, then progressive steepening.
     * progress = normalized log-space along multiplier.
     */
    const plot = (progress: number, w: number, h: number): Pt => {
      const x0 = PAD.l
      const y0 = h - PAD.b
      const x1 = w - PAD.r * 0.85
      const y1 = PAD.t + 10
      const p = Math.min(1, Math.max(0, progress))
      // Nearly horizontal early (S9 start), then progressive climb
      const xEase = 1 - Math.pow(1 - p, 1.28)
      const yEase = Math.pow(p, 2.35)
      return {
        x: x0 + (x1 - x0) * xEase,
        y: y0 - (y0 - y1) * (0.01 + 0.99 * yEase),
      }
    }

    const progressOf = (m: number) => {
      const cap = Math.max(axisMax.current.m, 2.2)
      return Math.min(1, Math.log(Math.max(1.001, m)) / Math.log(cap))
    }

    const draw = (now: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = size.w
      const h = size.h
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const ph = phaseRef.current
      const flying = ph === 'flying' || ph === 'launching' || ph === 'flewAway'
      starOff.current += ph === 'flying' ? 0.12 : 0.045

      // ── Far base (S9 purple space — slightly lifted) ──
      const bg = imgs.current.bg
      if (bg?.complete) {
        const scale = Math.max(w / bg.width, h / bg.height) * 1.02
        const bw = bg.width * scale
        const bh = bg.height * scale
        ctx.drawImage(bg, (w - bw) / 2, (h - bh) / 2, bw, bh)
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, h)
        g.addColorStop(0, '#1a1035')
        g.addColorStop(0.5, '#120a28')
        g.addColorStop(1, '#0a0618')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
      }

      // Soft purple atmosphere — open center, no heavy black vignette
      const wash = ctx.createRadialGradient(w * 0.52, h * 0.42, 10, w * 0.5, h * 0.5, w * 0.75)
      wash.addColorStop(0, 'rgba(90, 40, 140, 0.10)')
      wash.addColorStop(0.55, 'rgba(40, 18, 80, 0.08)')
      wash.addColorStop(1, 'rgba(10, 6, 24, 0.22)')
      ctx.fillStyle = wash
      ctx.fillRect(0, 0, w, h)

      // Distant nebulae — edges only, very soft
      imgs.current.nebulae.forEach((im, i) => {
        if (!im.complete) return
        const speed = 0.02 + i * 0.01
        const nx = ((starOff.current * speed) % (w + 160)) - 80
        const side = i % 2 === 0 ? -0.08 : 0.62
        ctx.globalAlpha = 0.08
        ctx.drawImage(im, nx + side * w, (i % 3) * 14 - 8, w * 0.42, h * 0.42)
        ctx.globalAlpha = 1
      })

      // Star parallax
      imgs.current.stars.forEach((im, i) => {
        if (!im.complete) return
        const spd = 0.04 + i * 0.08
        const sx = -((starOff.current * spd) % w)
        ctx.globalAlpha = 0.28 + i * 0.12
        ctx.drawImage(im, sx, 0, w, h)
        ctx.drawImage(im, sx + w, 0, w, h)
        ctx.globalAlpha = 1
      })

      // Soft edge planet accents (bg already has main planets — keep light)
      PLANETS.forEach((pl) => {
        const im = imgs.current.planets[pl.key]
        if (!im?.complete || !im.naturalWidth) return
        const px = pl.x * w + Math.sin(starOff.current * pl.speed) * 4
        const py = pl.y * h + Math.cos(starOff.current * pl.speed * 0.7) * 2
        const ps = Math.min(w, h) * pl.s
        ctx.globalAlpha = pl.a
        ctx.drawImage(im, px - ps / 2, py - ps / 2, ps, ps)
        ctx.globalAlpha = 1
      })

      // Midground dust — subtle
      const dust = imgs.current.dust
      if (dust?.complete) {
        const dx = -((starOff.current * 0.12) % w)
        ctx.globalAlpha = 0.12
        ctx.drawImage(dust, dx, 0, w, h)
        ctx.drawImage(dust, dx + w, 0, w, h)
        ctx.globalAlpha = 1
      }

      // Soft horizon grid (barely visible)
      ctx.strokeStyle = 'rgba(140, 110, 200, 0.035)'
      ctx.lineWidth = 1
      for (let i = 0; i < 5; i++) {
        const y = PAD.t + ((h - PAD.t - PAD.b) * i) / 4
        ctx.beginPath()
        ctx.moveTo(PAD.l, y)
        ctx.lineTo(w - PAD.r, y)
        ctx.stroke()
      }

      let tip: Pt = { x: PAD.l + 36, y: h - PAD.b - 22 }
      // Sprite is horizontal nose-right; angle 0 = flight right. Negative = nose up.
      let angle = -0.1
      let pose: RocketPose = 'idle'
      let flameScale = 0.45
      let rocketDim = 1
      let spinY = 0
      let bankX = 0

      if (ph === 'waiting' || ph === 'loading') {
        const prep = waitRef.current > 0.72
        tip = {
          x: PAD.l + 44 + Math.sin(now / 420) * 1.2,
          y: h - PAD.b - 26 + Math.sin(now / 310) * 0.9,
        }
        // Idle: nearly flat like S9 start — rocket, not plane dive
        angle = -0.06 + Math.sin(now / 520) * 0.018
        spinY = Math.sin(now / 360) * 8
        bankX = Math.sin(now / 480) * 4
        pose = prep ? 'prep' : 'idle'
        flameScale = prep ? 0.55 + Math.sin(now / 120) * 0.05 : 0.28
        rocketDim = 1
      } else if (flying) {
        const start = flightRef.current ?? now
        const elapsed =
          ph === 'launching' ? Math.max(0, now - launchT0.current) * 0.4 : Math.max(0, now - start)
        let m =
          ph === 'flewAway'
            ? crashRef.current
            : ph === 'launching'
              ? 1 + (now - launchT0.current) / LAUNCH_FAKE
              : multAt(elapsed)
        if (ph === 'launching') m = Math.min(1.12, m)
        if (ph === 'flewAway') m = crashRef.current

        axisMax.current.m = Math.max(axisMax.current.m, m * 1.18, 2.2)

        const prog = progressOf(m)
        tip = plot(prog, w, h)

        // Angle from curve tangent
        const p0 = plot(Math.max(0, prog - 0.02), w, h)
        const p1 = plot(Math.min(1, prog + 0.02), w, h)
        angle = Math.atan2(p1.y - p0.y, p1.x - p0.x)
        // 3D bank / yaw feel along the curve
        spinY = Math.sin(now / 140) * 14 + Math.sin(now / 310) * 6
        bankX = Math.sin(now / 190) * 7

        if (ph === 'flewAway') {
          const dt = Math.min(1, (now - crashAnimT0.current) / 780)
          const ease = 1 - Math.pow(1 - dt, 2.2)
          tip = {
            x: tip.x + ease * w * 0.48,
            y: tip.y - ease * h * 0.42,
          }
          angle = -0.55 - ease * 0.55
          spinY = 25 + ease * 40
          bankX = -12 - ease * 18
          pose = 'away'
          flameScale = 1.35 * (1 - ease * 0.5)
          rocketDim = Math.max(0, 1 - ease * 1.05)
        } else if (ph === 'launching') {
          const lt = (now - launchT0.current) / LAUNCH_MS_SAFE
          pose = lt < 0.45 ? 'ignition' : 'takeoff'
          flameScale = 0.75 + lt * 0.28
          spinY = Math.sin(now / 90) * 10
        } else if (m > 5) {
          pose = 'accel'
          flameScale = 1.05 + Math.min(0.45, (m - 5) * 0.05)
          tip = {
            x: tip.x + Math.sin(now / 40) * 0.7,
            y: tip.y + Math.cos(now / 35) * 0.5,
          }
        } else if (m > 2) {
          pose = 'fly'
          flameScale = 0.88 + (m - 2) * 0.05
        } else {
          pose = 'fly'
          flameScale = 0.78
        }

        // ── Layered trail (no chart polygon) ──
        const steps = 56
        const pts: Pt[] = []
        for (let i = 0; i <= steps; i++) {
          const tm = 1 + (m - 1) * (i / steps)
          pts.push(plot(progressOf(tm), w, h))
        }
        // Origin nudge to launch pad
        pts[0] = { x: PAD.l + 10, y: h - PAD.b - 6 }

        // Atmospheric haze under curve — soft radial fade, not a triangle
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
        // follow bottom with soft dip rather than hard corner
        const last = pts[pts.length - 1]
        ctx.quadraticCurveTo(last.x, h - PAD.b + 4, pts[0].x + 20, h - PAD.b + 2)
        ctx.closePath()
        const haze = ctx.createLinearGradient(0, last.y, 0, h)
        haze.addColorStop(0, 'rgba(255,180,60,0.10)')
        haze.addColorStop(0.45, 'rgba(255,100,160,0.04)')
        haze.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = haze
        ctx.fill()
        ctx.restore()

        // Magenta secondary glow
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
        ctx.strokeStyle = 'rgba(255,70,170,0.35)'
        ctx.lineWidth = 6
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.shadowColor = 'rgba(255,60,160,0.35)'
        ctx.shadowBlur = 8
        ctx.stroke()
        ctx.restore()

        // Warm yellow core
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
        ctx.strokeStyle = 'rgba(255,225,90,0.95)'
        ctx.lineWidth = 2.6
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.shadowColor = 'rgba(255,200,60,0.7)'
        ctx.shadowBlur = 7
        ctx.stroke()
        ctx.restore()

        // Engine particles
        if ((ph === 'flying' || ph === 'launching') && Math.random() < 0.5) {
          const backAng = angle + Math.PI
          particles.current.push({
            x: tip.x + Math.cos(backAng) * 18,
            y: tip.y + Math.sin(backAng) * 18,
            life: 1,
            vx: Math.cos(backAng) * (0.8 + Math.random()) + (Math.random() - 0.5) * 0.4,
            vy: Math.sin(backAng) * (0.8 + Math.random()) + (Math.random() - 0.5) * 0.4,
            s: 1 + Math.random() * 2.2,
            warm: Math.random(),
          })
        }
        particles.current = particles.current.filter((pt) => {
          pt.life -= 0.022
          pt.x += pt.vx
          pt.y += pt.vy
          if (pt.life <= 0) return false
          ctx.globalAlpha = pt.life * 0.85
          ctx.fillStyle = pt.warm > 0.45 ? '#ffc45a' : '#ff6ec8'
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, pt.s, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
          return true
        })

        // High-speed streaks
        if (m > 4 && ph === 'flying') {
          ctx.strokeStyle = 'rgba(180,210,255,0.12)'
          ctx.lineWidth = 1
          for (let i = 0; i < 5; i++) {
            const sy = (now / 18 + i * 36) % h
            ctx.beginPath()
            ctx.moveTo(w * 0.25, sy)
            ctx.lineTo(w * 0.55, sy - 10)
            ctx.stroke()
          }
        }
      }

      // Rocket / flame / mult DOM sync
      const rk = rocketRef.current
      const fl = flameRef.current
      const lm = liveMultEl.current
      const wu = waitUiRef.current

      if (poseRef.current !== pose && rk) {
        poseRef.current = pose
        rk.src = POSE_SRC[pose]
      }
      if (rk) {
        const vib = pose === 'accel' ? Math.sin(now / 38) * 0.5 : 0
        const rw = ROCKET_DISPLAY * (pose === 'away' ? 1.08 : 1)
        const rh = rw * 0.38
        rk.style.width = `${rw}px`
        rk.style.height = `${rh}px`
        rk.style.left = `${tip.x - rw * 0.42 + vib}px`
        rk.style.top = `${tip.y - rh * 0.5}px`
        rk.style.transform = `perspective(260px) rotateZ(${angle}rad) rotateY(${spinY}deg) rotateX(${bankX}deg)`
        rk.style.opacity = ph === 'loading' ? '0' : String(rocketDim)
        rk.style.filter =
          pose === 'accel' || pose === 'away'
            ? 'drop-shadow(0 0 8px rgba(255,140,60,0.5))'
            : 'drop-shadow(0 0 5px rgba(255,100,200,0.3))'
      }
      if (fl) {
        // Sprite already has exhaust — keep FX flame soft / rearward only while flying
        const show =
          ph === 'launching' ||
          ph === 'flying' ||
          (ph === 'flewAway' && rocketDim > 0.15) ||
          (ph === 'waiting' && waitRef.current > 0.6)
        fl.style.opacity = show ? String(0.28 + flameScale * 0.22) : '0'
        flameFrame.current = (flameFrame.current + 0.4) % 8
        const fi = Math.floor(flameFrame.current)
        const fw = 42 * flameScale
        const fh = 26 * Math.min(1.15, flameScale)
        fl.style.width = `${fw}px`
        fl.style.height = `${fh}px`
        fl.style.backgroundSize = `${fw * 8}px ${fh}px`
        fl.style.backgroundPosition = `${-fi * fw}px 0`
        const back = angle + Math.PI
        fl.style.left = `${tip.x + Math.cos(back) * (ROCKET_DISPLAY * 0.34) - fw * 0.2}px`
        fl.style.top = `${tip.y + Math.sin(back) * (ROCKET_DISPLAY * 0.34) - fh * 0.45}px`
        fl.style.transform = `rotate(${angle}rad)`
      }
      if (lm) {
        const show = ph === 'flying' || ph === 'flewAway' || ph === 'launching'
        lm.style.opacity = show ? '1' : '0'
        const displayM = ph === 'flewAway' ? crashRef.current : multRefVal.current
        lm.textContent = `${displayM.toFixed(2)}x`
        lm.style.color = ph === 'flewAway' ? '#ffd86a' : multColor(displayM)
        const glow = ph === 'flewAway' ? '#ffd86a' : multColor(displayM)
        lm.style.textShadow = `0 0 22px ${glow}66, 0 0 40px rgba(0,0,0,0.85), 0 3px 8px #000`
        const milestone = displayM >= 2 && Math.abs(displayM % 1) < 0.05
        const boom = ph === 'flewAway' ? 1.12 : milestone ? 1.06 : 1
        lm.style.transform = `translate(-50%, -50%) scale(${boom})`
        lm.style.left = `${w * 0.5}px`
        lm.style.top = `${h * 0.26}px`
      }
      if (wu) {
        const showWait = ph === 'waiting'
        wu.style.opacity = showWait ? '1' : '0'
        const secs = Math.max(0, Math.ceil(waitLeftRef.current / 1000))
        const ring = wu.querySelector('[data-ring]') as SVGCircleElement | null
        const label = wu.querySelector('[data-label]')
        const sub = wu.querySelector('[data-sub]')
        if (label) label.textContent = 'WAITING FOR NEXT ROUND'
        if (sub) sub.textContent = secs > 0 ? `${secs}s` : 'GO'
        if (ring) {
          const circ = 2 * Math.PI * 38
          ring.style.strokeDasharray = `${circ}`
          ring.style.strokeDashoffset = `${circ * (1 - waitRef.current)}`
        }
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [size.w, size.h])

  return (
    <div ref={wrapRef} className={styles.arena}>
      <canvas ref={canvasRef} className={styles.arenaCanvas} />
      <div
        ref={flameRef}
        className={styles.flame}
        style={{ backgroundImage: `url(${FX.flame})` }}
      />
      <img ref={rocketRef} className={styles.rocket} src={ROCKET.idle} alt="" draggable={false} />
      <div ref={liveMultEl} className={styles.liveMult}>
        1.00x
      </div>
      <div ref={waitUiRef} className={styles.waitUi}>
        <svg className={styles.waitRing} viewBox="0 0 90 90" aria-hidden>
          <circle cx="45" cy="45" r="38" className={styles.waitRingTrack} />
          <circle cx="45" cy="45" r="38" data-ring className={styles.waitRingProg} />
        </svg>
        <div className={styles.waitCopy}>
          <span data-label>WAITING FOR NEXT ROUND</span>
          <em data-sub>—</em>
        </div>
      </div>
      {floatTags.map((t) => (
        <div
          key={`${t.name}-${t.mult}`}
          className={styles.floatTag}
          style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%` }}
        >
          {t.name}@{t.mult.toFixed(2)}x
        </div>
      ))}
      {phase === 'flewAway' && <div className={styles.flewBanner}>FLEW AWAY</div>}
    </div>
  )
}

const LAUNCH_MS_SAFE = 900
