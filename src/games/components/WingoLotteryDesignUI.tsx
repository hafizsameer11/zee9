import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { getDesignCanvasStyle, getDesignScaleShellStyle, type DesignLayout } from '../hooks/useDesignScale'
import {
  ballSrc,
  CASINO_ASSETS as A,
  chipBoardSrc,
  chipLabel,
  chipSrc,
  COLOR_MULT,
  DEMO_LEFT,
  DEMO_RIGHT,
  NUMBER_MULT,
  numberColor,
  sumBets,
  type ChipDenom,
  type PlacedChip,
  type RoundPhase,
  type SidePlayer,
  type WlBetKey,
  type WlColor,
  CHIP_DENOMS,
} from '../engines/wingoLottery'
import { sound } from '../../lib/sound'
import styles from './wingoLottery.module.css'

const IS_DEV = import.meta.env.DEV

export type WingoLotteryDesignUIProps = {
  viewportRef: RefObject<HTMLDivElement | null>
  layout: DesignLayout
  balance: number
  playerId: string
  selectedChip: ChipDenom
  chips: PlacedChip[]
  history: number[]
  seconds: number
  phase: RoundPhase
  result: number | null
  bettingOpen: boolean
  lastWin: number
  onHome: () => void
  onSelectChip: (d: ChipDenom) => void
  onPlace: (key: WlBetKey, rect: DOMRect, origin: { x: number; y: number }) => void
  onBotChip: (chip: PlacedChip) => void
  onRebet: () => void
  onPreview?: (p: RoundPhase | 'FULL_ROUND' | 'CHIP_BURST') => void
  assetsReady?: boolean
  loadProgress?: number
  livePublicBets?: Array<{ id: string; betKey: WlBetKey; amount: number }>
  onPublicConsumed?: (id: string) => void
  /** When false, skip cosmetic bot chip filler (real public bets are enough). */
  cosmeticBots?: boolean
  /** Shared table totals from server (all players). */
  cellTotals?: Record<string, number>
  playersOnline?: number
}

function PlayerCard({ p }: { p: SidePlayer }) {
  const frame =
    p.badge === 'winner' ? A.frameWinner : p.badge === 'lucky' ? A.frameLucky : A.frameNormal
  return (
    <div className={styles.playerCard} data-side-player={p.id}>
      <div className={styles.avatarWrap}>
        {p.badge === 'winner' && <img className={styles.playerBadge} src={A.winner} alt="" draggable={false} />}
        {p.badge === 'lucky' && <img className={styles.playerBadge} src={A.lucky} alt="" draggable={false} />}
        <img className={styles.avatar} src={A.avatar(p.avatar)} alt="" draggable={false} />
        <img className={styles.avatarFrame} src={frame} alt="" draggable={false} />
      </div>
      <div className={styles.playerMeta}>
        <div className={styles.playerName}>{p.name}</div>
        <div className={styles.playerBal}>
          <span className={styles.coinDot} />
          {p.balance.toLocaleString()}
        </div>
      </div>
    </div>
  )
}

function PlacedStack({ chips, area }: { chips: PlacedChip[]; area: 'color' | 'num' }) {
  const variants: Array<'a' | 'b' | 'c' | 'd'> = ['a', 'b', 'c', 'd']
  // Keep DOM work bounded during rapid betting; totals still include every bet.
  const visible = chips.slice(-20)
  return (
    <div className={area === 'color' ? styles.chipStack : styles.numChips}>
      {visible.map((c, i) => {
        const sz = area === 'color' ? 17 + (i % 4) * 2 : 16 + (i % 3)
        return (
          <img
            key={c.id}
            className={styles.placedChip}
            src={chipBoardSrc(c.denom, variants[i % 4]!)}
            alt=""
            draggable={false}
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              transform: `rotate(${c.rot}deg)`,
              width: sz,
              height: sz,
              zIndex: i + 1,
            }}
          />
        )
      })}
    </div>
  )
}

/** rAF ball mixer — design-pixel physics (clientWidth, not getBoundingClientRect). */
function MixingBalls({
  active,
  slowing,
  winning,
}: {
  active: boolean
  slowing: boolean
  winning: number | null
}) {
  const chamberRef = useRef<HTMLDivElement>(null)
  const refs = useRef<(HTMLImageElement | null)[]>([])
  const raf = useRef(0)
  const lastBounceSfx = useRef(0)
  const slowingRef = useRef(slowing)
  const winningRef = useRef(winning)
  slowingRef.current = slowing
  winningRef.current = winning

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(raf.current)
      return
    }

    let cancelled = false
    let startId = 0
    type Ball = {
      n: number
      x: number
      y: number
      vx: number
      vy: number
      rot: number
      vr: number
      scale: number
      r: number
    }
    let balls: Ball[] = []
    let t0 = 0
    let last = 0
    let cx = 0
    let cy = 0
    let rx = 0
    let ry = 0

    const measure = () => {
      const el = chamberRef.current
      // clientWidth/Height = design CSS px (ignores parent scale transform)
      const W = Math.max(160, el?.clientWidth || 200)
      const H = Math.max(140, el?.clientHeight || 180)
      cx = W * 0.5
      cy = H * 0.5
      rx = W * 0.47
      ry = H * 0.47
      return { W, H }
    }

    const boot = () => {
      if (cancelled) return
      const { W, H } = measure()
      const baseR = Math.max(16, Math.min(W, H) * 0.11)
      t0 = performance.now()
      last = t0
      balls = Array.from({ length: 10 }, (_, i) => {
        const ang = (i / 10) * Math.PI * 2
        const rad = 0.15 + Math.random() * 0.7
        const scale = 0.92 + Math.random() * 0.28
        const r = baseR * scale
        const speed = 11 + Math.random() * 8
        const dir = ang + Math.PI * 0.55 + (Math.random() - 0.5)
        return {
          n: i,
          x: cx + Math.cos(ang) * rx * rad,
          y: cy + Math.sin(ang) * ry * rad,
          vx: Math.cos(dir) * speed,
          vy: Math.sin(dir) * speed,
          rot: Math.random() * 360,
          vr: (Math.random() - 0.5) * 24,
          scale,
          r,
        }
      })
      // paint first frame immediately so balls aren't stacked at 0,0
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i]!
        const el = refs.current[i]
        if (el) {
          el.style.transform = `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0) rotate(${b.rot}deg) scale(${b.scale})`
          el.style.opacity = '1'
        }
      }
      sound.play('spin', { volume: 0.38 })
      sound.play('whoosh', { volume: 0.28 })
      raf.current = requestAnimationFrame(tick)
    }

    const clampEllipse = (b: Ball) => {
      const nx = (b.x - cx) / Math.max(6, rx - b.r * 0.85)
      const ny = (b.y - cy) / Math.max(6, ry - b.r * 0.85)
      const d2 = nx * nx + ny * ny
      if (d2 <= 1) return false
      const d = Math.sqrt(d2)
      const ux = nx / d
      const uy = ny / d
      b.x = cx + ux * (rx - b.r * 0.85)
      b.y = cy + uy * (ry - b.r * 0.85)
      const push = b.vx * ux + b.vy * uy
      if (push > 0) {
        b.vx -= push * ux * 1.85
        b.vy -= push * uy * 1.85
      }
      b.vx -= ux * (3.5 + Math.random() * 4)
      b.vy -= uy * (3.5 + Math.random() * 4)
      return true
    }

    const tick = (now: number) => {
      if (cancelled) return
      const slowingNow = slowingRef.current
      const winningNow = winningRef.current
      const rawDt = Math.min(40, now - last) / 16.67
      last = now
      const elapsed = (now - t0) / 1000
      // violent shuffle for most of the mix
      const drive = slowingNow
        ? 0.28
        : elapsed < 4.2
          ? 1.35
          : Math.max(0.55, 1.35 - (elapsed - 4.2) * 0.4)

      const steps = Math.max(1, Math.min(4, Math.ceil(rawDt)))
      const dt = rawDt / steps

      for (let step = 0; step < steps; step++) {
        const jetAng = elapsed * 4.2 + step * 0.4
        const jetX = Math.cos(jetAng) * 0.9
        const jetY = Math.sin(jetAng * 1.3) * 0.75

        for (let i = 0; i < balls.length; i++) {
          const b = balls[i]!
          if (slowingNow && winningNow != null && b.n === winningNow) {
            b.x += (cx - b.x) * 0.12 * dt
            b.y += (cy - 8 - b.y) * 0.12 * dt
            b.vx *= 0.8
            b.vy *= 0.8
            b.rot += 8 * dt
            b.scale += (1.35 - b.scale) * 0.1
            continue
          }

          // strong vortex + turbulence — never settle into a pile
          b.vx += (-(b.y - cy) * 0.028 + jetX + Math.sin(elapsed * 6.5 + i * 1.7) * 0.95) * drive * dt
          b.vy += ((b.x - cx) * 0.028 + jetY + Math.cos(elapsed * 5.8 + i * 1.1) * 0.85) * drive * dt

          if (!slowingNow && Math.random() < 0.06 * drive * dt) {
            b.vx += (Math.random() - 0.5) * 10 * drive
            b.vy -= (5 + Math.random() * 9) * drive
          }

          b.x += b.vx * drive * dt
          b.y += b.vy * drive * dt
          b.rot += (b.vr + b.vx * 4.2 + b.vy * 1.6) * drive * dt

          const spd = Math.hypot(b.vx, b.vy)
          const maxSpd = slowingNow ? 5 : 18
          const minSpd = slowingNow ? 1.2 : 7.5
          if (spd > maxSpd) {
            b.vx = (b.vx / spd) * maxSpd
            b.vy = (b.vy / spd) * maxSpd
          } else if (spd < minSpd) {
            const boost = minSpd / Math.max(0.15, spd)
            b.vx *= boost
            b.vy *= boost
          }

          let bounced = clampEllipse(b)

          for (let j = i + 1; j < balls.length; j++) {
            const o = balls[j]!
            if (slowingNow && winningNow != null && o.n === winningNow) continue
            const dx = o.x - b.x
            const dy = o.y - b.y
            const dist = Math.hypot(dx, dy) || 0.01
            const minD = (b.r + o.r) * 0.92
            if (dist < minD) {
              const nx = dx / dist
              const ny = dy / dist
              const overlap = (minD - dist) * 0.6
              b.x -= nx * overlap
              b.y -= ny * overlap
              o.x += nx * overlap
              o.y += ny * overlap
              const impact = (b.vx - o.vx) * nx + (b.vy - o.vy) * ny
              if (impact > 0) {
                const impulse = impact * 0.78
                b.vx -= impulse * nx
                b.vy -= impulse * ny
                o.vx += impulse * nx
                o.vy += impulse * ny
                bounced = true
              }
            }
          }

          if (bounced && now - lastBounceSfx.current > 55) {
            lastBounceSfx.current = now
            if (Math.random() > 0.35) sound.play('tick', { volume: 0.12 + Math.random() * 0.14 })
          }
        }
      }

      for (let i = 0; i < balls.length; i++) {
        const b = balls[i]!
        const el = refs.current[i]
        if (!el) continue
        el.style.transform = `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0) rotate(${b.rot}deg) scale(${b.scale})`
        el.style.zIndex = String(20 + Math.round(b.y))
        el.style.opacity = slowingNow && winningNow != null && b.n === winningNow ? '0.08' : '1'
      }

      raf.current = requestAnimationFrame(tick)
    }

    startId = window.requestAnimationFrame(() => {
      startId = window.requestAnimationFrame(boot)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(startId)
      cancelAnimationFrame(raf.current)
    }
  }, [active])

  if (!active) return null
  return (
    <div className={styles.machineChamber} ref={chamberRef}>
      {Array.from({ length: 10 }, (_, i) => (
        <img
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          className={styles.mixBall}
          src={ballSrc(i, 'machine')}
          alt=""
          draggable={false}
        />
      ))}
    </div>
  )
}

export default function WingoLotteryDesignUI({
  viewportRef,
  layout,
  balance,
  playerId,
  selectedChip,
  chips,
  history,
  seconds,
  phase,
  result,
  bettingOpen,
  lastWin,
  onHome,
  onSelectChip,
  onPlace,
  onBotChip,
  onRebet,
  onPreview,
  assetsReady = true,
  loadProgress = 100,
  livePublicBets = [],
  onPublicConsumed,
  cosmeticBots = true,
  cellTotals,
  playersOnline = 1,
}: WingoLotteryDesignUIProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const chipBarRef = useRef<HTMLDivElement>(null)
  const flyLayerRef = useRef<HTMLDivElement>(null)
  const botSeq = useRef(0)
  const lastBotSfx = useRef(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [showStartBanner, setShowStartBanner] = useState(false)
  const [refOpacity, setRefOpacity] = useState(0) // 0,25,50,75,100 — Alt+R cycles
  const [winFx, setWinFx] = useState<{ amount: number; id: number } | null>(null)
  const [winCount, setWinCount] = useState(0)

  const showStop = phase === 'STOP_BETTING'
  const showStart = phase === 'START_BETTING'
  const showWin = winFx != null || phase === 'WIN_CELEBRATION'
  const winAmount = winFx?.amount ?? (phase === 'WIN_CELEBRATION' ? Math.max(lastWin, 2580) : 0)
  const showMachine =
    phase === 'MACHINE_ENTERING' ||
    phase === 'BALLS_MIXING' ||
    phase === 'BALL_SELECTED' ||
    phase === 'WINNING_BALL_EXIT' ||
    phase === 'RESULT_REVEAL' ||
    phase === 'RESULT_TO_HISTORY'
  const machineExiting = phase === 'RESULT_TO_HISTORY'
  const mixing =
    phase === 'BALLS_MIXING' ||
    phase === 'MACHINE_ENTERING' ||
    phase === 'BALL_SELECTED' ||
    phase === 'WINNING_BALL_EXIT' ||
    phase === 'RESULT_REVEAL'
  const slowing = phase === 'BALL_SELECTED' || phase === 'WINNING_BALL_EXIT' || phase === 'RESULT_REVEAL'
  const reveal =
    phase === 'BALL_SELECTED' ||
    phase === 'WINNING_BALL_EXIT' ||
    phase === 'RESULT_REVEAL' ||
    phase === 'RESULT_TO_HISTORY' ||
    phase === 'SETTLEMENT'
  const dim = showMachine || showStop || showWin
  const shake = phase === 'BALLS_MIXING'
  const timeLabel = `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`

  useEffect(() => {
    if (phase === 'MACHINE_ENTERING') sound.play('whoosh', { volume: 0.4 })
    if (phase === 'STOP_BETTING') sound.play('notify', { volume: 0.35 })
    if (phase === 'BALL_SELECTED' || phase === 'RESULT_REVEAL') sound.play('reveal', { volume: 0.55 })
    if (phase === 'START_BETTING') sound.play('open', { volume: 0.3 })
  }, [phase])

  const hist = useMemo(() => history.slice(-11), [history])

  useEffect(() => {
    if (phase !== 'BETTING_OPEN') return
    setShowStartBanner(true)
    const t = window.setTimeout(() => setShowStartBanner(false), 900)
    return () => window.clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (!IS_DEV || !onPreview) return
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setPreviewOpen((v) => !v)
      }
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        setRefOpacity((o) => {
          const steps = [0, 25, 50, 75, 100]
          const i = steps.indexOf(o)
          return steps[(i + 1) % steps.length]!
        })
        return
      }
      const map: Record<string, RoundPhase | 'FULL_ROUND' | 'CHIP_BURST'> = {
        b: 'BETTING_OPEN',
        s: 'STOP_BETTING',
        m: 'MACHINE_ENTERING',
        x: 'BALLS_MIXING',
        r: 'RESULT_REVEAL',
        h: 'RESULT_TO_HISTORY',
        p: 'SETTLEMENT',
        f: 'FULL_ROUND',
      }
      const cmd = map[e.key.toLowerCase()]
      if (cmd && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        onPreview(cmd)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPreview])

  const toCanvasPoint = useCallback(
    (rect: DOMRect) => {
      const board = canvasRef.current?.getBoundingClientRect()
      const scale = layout.scale || 1
      if (!board) return { x: 425, y: 240 }
      return {
        x: (rect.left + rect.width / 2 - board.left) / scale,
        y: (rect.top + rect.height / 2 - board.top) / scale,
      }
    },
    [layout.scale],
  )

  const spawnFly = useCallback(
    (
      src: string,
      from: { x: number; y: number },
      to: { x: number; y: number },
      onDone: () => void,
      opts?: { soft?: boolean; size?: number },
    ) => {
      const layer = flyLayerRef.current
      if (!layer) {
        onDone()
        return
      }
      const soft = opts?.soft ?? false
      const size = opts?.size ?? (soft ? 28 : 36)
      const half = size / 2
      const now = performance.now()
      if (!soft || now - lastBotSfx.current > 110) {
        lastBotSfx.current = now
        sound.play('whoosh', { volume: soft ? 0.18 : 0.28 })
        sound.play('chip', { volume: soft ? 0.22 : 0.32 })
      }
      const img = document.createElement('img')
      img.src = src
      img.alt = ''
      img.draggable = false
      img.className = styles.flyChip
      img.style.width = `${size}px`
      img.style.height = `${size}px`
      img.style.left = `${from.x - half}px`
      img.style.top = `${from.y - half}px`
      layer.appendChild(img)

      const duration = soft ? 420 + Math.random() * 160 : 520
      const start = performance.now()
      const midX = (from.x + to.x) / 2 + (from.y - to.y) * (soft ? 0.12 : 0.2)
      const midY = Math.min(from.y, to.y) - (soft ? 28 : 48) - Math.random() * (soft ? 24 : 36)

      const step = (tNow: number) => {
        const t = Math.min(1, (tNow - start) / duration)
        const e = 1 - Math.pow(1 - t, soft ? 2.4 : 2.85)
        const omt = 1 - e
        const x = omt * omt * from.x + 2 * omt * e * midX + e * e * to.x
        const y = omt * omt * from.y + 2 * omt * e * midY + e * e * to.y
        const rot = e * (soft ? 180 : 220) - 30
        const bounce = t > 0.82 ? Math.sin(((t - 0.82) / 0.18) * Math.PI) * 0.16 : 0
        const scale = 1.15 - e * 0.35 + bounce
        img.style.transform = `translate3d(${x - from.x}px, ${y - from.y}px, 0) rotate(${rot}deg) scale(${scale})`
        if (t < 1) requestAnimationFrame(step)
        else {
          img.remove()
          if (soft && performance.now() - lastBotSfx.current > 70) {
            lastBotSfx.current = performance.now()
            sound.play('chip', { volume: 0.3 })
          }
          onDone()
        }
      }
      requestAnimationFrame(step)
    },
    [],
  )

  // Other players: fly chips from side avatars into boxes (same motion + voice as yours)
  useEffect(() => {
    if (!bettingOpen || !assetsReady || !cosmeticBots) return
    let cancelled = false
    let inFlight = 0
    const timers: number[] = []
    const queue: Array<() => void> = []
    const sidePlayers = [...DEMO_LEFT, ...DEMO_RIGHT]
    const betKeys: WlBetKey[] = [
      'color:green',
      'color:violet',
      'color:red',
      ...Array.from({ length: 10 }, (_, i) => `num:${i}` as WlBetKey),
    ]
    const weighted: WlBetKey[] = [
      ...betKeys,
      'color:green',
      'color:violet',
      'color:red',
      'color:green',
      'color:red',
    ]

    const pump = () => {
      while (!cancelled && inFlight < 4 && queue.length > 0) {
        const job = queue.shift()!
        inFlight += 1
        job()
      }
    }

    const enqueueBotBet = () => {
      if (cancelled || !canvasRef.current) return
      const player = sidePlayers[Math.floor(Math.random() * sidePlayers.length)]!
      const denom = CHIP_DENOMS[Math.floor(Math.random() * CHIP_DENOMS.length)]!
      const key = weighted[Math.floor(Math.random() * weighted.length)]!
      const originEl = canvasRef.current.querySelector(
        `[data-side-player="${player.id}"]`,
      ) as HTMLElement | null
      const cellEl = canvasRef.current.querySelector(`[data-bet="${key}"]`) as HTMLElement | null
      if (!originEl || !cellEl) return

      const from = toCanvasPoint(originEl.getBoundingClientRect())
      const cell = cellEl.getBoundingClientRect()
      const to = toCanvasPoint(cell)
      to.x += (Math.random() - 0.5) * Math.min(36, cell.width * 0.35)
      to.y += (Math.random() - 0.5) * Math.min(28, cell.height * 0.3)

      queue.push(() => {
        spawnFly(
          chipSrc(denom, 'selector'),
          from,
          to,
          () => {
            if (!cancelled) {
              onBotChip({
                id: `b-${++botSeq.current}`,
                denom,
                betKey: key,
                x: 8 + Math.random() * 72,
                y: 8 + Math.random() * 62,
                rot: -40 + Math.random() * 80,
                owner: 'bot',
              })
            }
            inFlight = Math.max(0, inFlight - 1)
            pump()
          },
          { soft: true, size: 26 },
        )
      })
      pump()
    }

    const burst = (count: number, staggerMs: number) => {
      for (let i = 0; i < count; i++) {
        timers.push(window.setTimeout(enqueueBotBet, i * staggerMs))
      }
    }

    burst(2, 200)
    const interval = window.setInterval(() => {
      if (Math.random() > 0.45) burst(1 + Math.floor(Math.random() * 2), 140)
    }, 1100)
    timers.push(interval)

    return () => {
      cancelled = true
      for (const t of timers) window.clearTimeout(t)
      window.clearInterval(interval)
    }
  }, [bettingOpen, assetsReady, cosmeticBots, spawnFly, toCanvasPoint, onBotChip])

  // Real other-player bets from server — fly from a side avatar into the box
  const flyingPublic = useRef(new Set<string>())
  useEffect(() => {
    if (!assetsReady || !livePublicBets.length || !canvasRef.current) return
    const sidePlayers = [...DEMO_LEFT, ...DEMO_RIGHT]

    for (const bet of livePublicBets) {
      if (flyingPublic.current.has(bet.id)) continue
      flyingPublic.current.add(bet.id)
      const player = sidePlayers[Math.floor(Math.random() * sidePlayers.length)]!
      const originEl = canvasRef.current.querySelector(
        `[data-side-player="${player.id}"]`,
      ) as HTMLElement | null
      const cellEl = canvasRef.current.querySelector(`[data-bet="${bet.betKey}"]`) as HTMLElement | null
      if (!originEl || !cellEl) {
        onPublicConsumed?.(bet.id)
        continue
      }
      let denom: ChipDenom = 10
      for (const d of CHIP_DENOMS) {
        if (Math.abs(d - bet.amount) < Math.abs(denom - bet.amount)) denom = d
      }
      const from = toCanvasPoint(originEl.getBoundingClientRect())
      const to = toCanvasPoint(cellEl.getBoundingClientRect())
      spawnFly(
        chipSrc(denom, 'selector'),
        from,
        to,
        () => {
          onBotChip({
            id: bet.id,
            denom,
            betKey: bet.betKey,
            x: 8 + Math.random() * 72,
            y: 8 + Math.random() * 62,
            rot: -40 + Math.random() * 80,
            owner: 'bot',
          })
          onPublicConsumed?.(bet.id)
        },
        { soft: true, size: 28 },
      )
    }
  }, [livePublicBets, assetsReady, spawnFly, toCanvasPoint, onBotChip, onPublicConsumed])

  useEffect(() => {
    if (lastWin <= 0) return
    const id = Date.now()
    setWinFx({ amount: lastWin, id })
    setWinCount(0)
    const start = performance.now()
    const dur = 900
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const e = 1 - Math.pow(1 - t, 3)
      setWinCount(Math.round(lastWin * e))
      if (t < 1) raf = requestAnimationFrame(tick)
      else setWinCount(lastWin)
    }
    raf = requestAnimationFrame(tick)

    const timers: number[] = []
    const launchCoins = () => {
      if (!canvasRef.current) return
      const bal = canvasRef.current.querySelector('[data-bal-target]') as HTMLElement | null
      const to = bal ? toCanvasPoint(bal.getBoundingClientRect()) : { x: 90, y: 430 }
      for (let i = 0; i < 8; i++) {
        timers.push(
          window.setTimeout(() => {
            const from = {
              x: 380 + (Math.random() - 0.5) * 120,
              y: 200 + (Math.random() - 0.5) * 60,
            }
            const denom = CHIP_DENOMS[Math.floor(Math.random() * CHIP_DENOMS.length)]!
            spawnFly(chipSrc(denom, 'selector'), from, to, () => {}, { soft: true, size: 22 })
          }, 180 + i * 90),
        )
      }
    }
    timers.push(window.setTimeout(launchCoins, 280))
    const hide = window.setTimeout(() => setWinFx((w) => (w?.id === id ? null : w)), 2800)
    return () => {
      cancelAnimationFrame(raf)
      for (const t of timers) window.clearTimeout(t)
      window.clearTimeout(hide)
    }
  }, [lastWin, spawnFly, toCanvasPoint])

  useEffect(() => {
    if (phase !== 'WIN_CELEBRATION') return
    const amt = Math.max(lastWin, 2580)
    setWinFx({ amount: amt, id: Date.now() })
    setWinCount(amt)
  }, [phase, lastWin])

  const place = (key: WlBetKey, el: HTMLElement) => {
    if (!bettingOpen || !canvasRef.current) return
    const cell = el.getBoundingClientRect()
    const chipEl = chipBarRef.current?.querySelector(`[data-chip="${selectedChip}"]`) as HTMLElement | null
    const originRect = chipEl?.getBoundingClientRect()
    const origin = originRect ? toCanvasPoint(originRect) : { x: 425, y: 430 }
    const target = toCanvasPoint(cell)
    // Commit optimistically on tap; flight animation runs independently.
    onPlace(key, cell, origin)
    spawnFly(chipSrc(selectedChip, 'selector'), origin, target, () => {})
  }

  const colors: WlColor[] = ['green', 'violet', 'red']
  const panelBg = (c: WlColor) =>
    c === 'green' ? A.panelGreen : c === 'violet' ? A.panelViolet : A.panelRed

  return (
    <div className={styles.root} ref={viewportRef}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div className={styles.canvas} style={getDesignCanvasStyle(layout)} ref={canvasRef}>
          {!assetsReady && (
            <div className={styles.assetLoader} aria-busy="true" aria-live="polite">
              <div className={styles.assetLoaderRing} />
              <div className={styles.assetLoaderText}>Loading table…</div>
              <div className={styles.assetLoaderBar}>
                <div className={styles.assetLoaderFill} style={{ width: `${loadProgress}%` }} />
              </div>
              <div className={styles.assetLoaderPct}>{loadProgress}%</div>
            </div>
          )}

          <div className={`${styles.tableScene} ${assetsReady ? styles.tableSceneReady : ''}`}>
          <div className={styles.table} style={{ backgroundImage: `url(${A.table})` }} />
          <img className={styles.tableLayer} src={A.tableTexture} alt="" draggable={false} />
          <img className={styles.tableHighlight} src={A.tableHighlight} alt="" draggable={false} />
          <img className={styles.cornerL} src={A.corner} alt="" draggable={false} />
          <img className={styles.cornerR} src={A.corner} alt="" draggable={false} />
          <img className={styles.tableVignette} src={A.tableVignette} alt="" draggable={false} />

          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <button type="button" className={`${styles.btnImg} ${styles.btnBack}`} onClick={onHome} aria-label="Back">
                <img src={A.back} alt="" draggable={false} />
              </button>
              <img className={styles.playBadge} src={A.play} alt="Play Game" draggable={false} />
            </div>

            <div className={styles.historyWrap}>
              <img className={styles.machineMini} src={A.machineMini} alt="" draggable={false} />
              <div className={styles.historyTray}>
                {hist.map((n, i) => (
                  <img
                    key={`${i}-${n}-${history.length}`}
                    className={`${styles.histBall} ${
                      i === hist.length - 1 && phase === 'RESULT_TO_HISTORY' ? styles.histBallNew : ''
                    }`}
                    src={ballSrc(n, 'history')}
                    alt={String(n)}
                    draggable={false}
                  />
                ))}
                <img className={styles.badgeNew} src={A.newBadge} alt="" draggable={false} />
              </div>
              <button type="button" className={`${styles.btnImg} ${styles.btnTrend}`} aria-label="History">
                <img src={A.history} alt="" draggable={false} />
              </button>
            </div>

            <div className={styles.headerRight}>
              <button type="button" className={`${styles.btnImg} ${styles.btnAdd}`} aria-label="Add funds">
                <img src={A.add} alt="" draggable={false} />
              </button>
              <button type="button" className={`${styles.btnImg} ${styles.btnMenu}`} aria-label="Menu">
                <img src={A.menu} alt="" draggable={false} />
              </button>
            </div>
          </header>

          <div className={`${styles.countdown} ${seconds <= 3 && bettingOpen ? styles.countdownUrgent : ''}`}>
            <span className={styles.countdownNum}>{Math.max(0, seconds)}</span>
            <span className={styles.countdownLabel}>Betting</span>
          </div>

          <aside className={styles.sideLeft}>
            {DEMO_LEFT.map((p) => (
              <PlayerCard key={p.id} p={p} />
            ))}
            <button type="button" className={styles.plusBtn} aria-label="More players">
              <img src={A.plus} alt="" draggable={false} />
            </button>
          </aside>

          <aside className={styles.sideRight}>
            {DEMO_RIGHT.map((p) => (
              <PlayerCard key={p.id} p={p} />
            ))}
          </aside>

          <div className={`${styles.board} ${!bettingOpen ? styles.locked : ''}`}>
            <div className={styles.colorRow}>
              {colors.map((c) => {
                const key: WlBetKey = `color:${c}`
                const total = cellTotals?.[key] ?? sumBets(chips, key)
                const win = result != null && numberColor(result) === c && reveal
                return (
                  <button
                    key={c}
                    type="button"
                    data-bet={key}
                    className={`${styles.colorPanel} ${c === 'violet' ? styles.colorPanelViolet : ''} ${win ? styles.colorPanelWin : ''}`}
                    style={{ backgroundImage: `url(${panelBg(c)})` }}
                    onClick={(e) => place(key, e.currentTarget)}
                    disabled={!bettingOpen}
                  >
                    {win && <img className={styles.cellGlow} src={A.glowGold} alt="" draggable={false} />}
                    <div className={styles.colorHead}>
                      <span className={styles.panelTotal}>{total > 0 ? total.toLocaleString() : ''}</span>
                      <span className={styles.panelHeadLabel}>{c[0]!.toUpperCase() + c.slice(1)}</span>
                      <span />
                    </div>
                    <div className={styles.panelBody}>
                      <span className={styles.panelGhost}>
                        {c[0]!.toUpperCase() + c.slice(1)}
                        <br />
                        X{COLOR_MULT[c]}
                      </span>
                      <span className={styles.panelMult}>X{COLOR_MULT[c]}</span>
                    </div>
                    <PlacedStack chips={chips.filter((x) => x.betKey === key)} area="color" />
                  </button>
                )
              })}
            </div>

            <div className={styles.numGrid}>
              {Array.from({ length: 10 }, (_, n) => {
                const key: WlBetKey = `num:${n}`
                const total = cellTotals?.[key] ?? sumBets(chips, key)
                const win = result === n && reveal
                return (
                  <button
                    key={n}
                    type="button"
                    data-bet={key}
                    className={`${styles.numCell} ${win ? styles.numCellWin : ''}`}
                    style={{ backgroundImage: `url(${A.cell})` }}
                    onClick={(e) => place(key, e.currentTarget)}
                    disabled={!bettingOpen}
                  >
                    {win && <img className={styles.cellGlow} src={A.glowCyan} alt="" draggable={false} />}
                    <div className={styles.numHead}>
                      {total > 0 && <span className={styles.coinDot} />}
                      <span>{total > 0 ? total.toLocaleString() : ''}</span>
                    </div>
                    <img className={styles.numBall} src={ballSrc(n, 'cell')} alt={String(n)} draggable={false} />
                    <span className={styles.numMult}>X{NUMBER_MULT}</span>
                    <PlacedStack chips={chips.filter((x) => x.betKey === key)} area="num" />
                  </button>
                )
              })}
            </div>
          </div>

          <footer className={styles.footer}>
            <img className={styles.footerConsole} src={A.footerConsole} alt="" draggable={false} />
            <div className={styles.footerInner}>
            <div className={styles.userBlock}>
              <button type="button" className={styles.socialBtn} aria-label={`${playersOnline} players online`}>
                <img src={A.group} alt="" draggable={false} />
                <span className={styles.onlineBadge}>{playersOnline}</span>
              </button>
              <div className={styles.userAvatarWrap}>
                <img className={styles.userAvatar} src={A.avatar(6)} alt="" draggable={false} />
                <img className={styles.userFrame} src={A.frameNormal} alt="" draggable={false} />
              </div>
              <div className={styles.userMeta}>
                <span className={styles.userId}>{playerId}</span>
                <span className={styles.userBal} data-bal-target>
                  <span className={styles.coinDot} />
                  {Math.round(balance).toLocaleString()}
                </span>
              </div>
            </div>

            <div className={styles.chipBar} ref={chipBarRef}>
              <button type="button" className={styles.chipArrow} aria-label="Prev">
                <img src={A.arrowLeft} alt="" draggable={false} />
              </button>
              {CHIP_DENOMS.map((d) => (
                <button
                  key={d}
                  type="button"
                  data-chip={d}
                  className={`${styles.chipBtn} ${selectedChip === d ? styles.chipSelected : ''}`}
                  onClick={() => onSelectChip(d)}
                  aria-label={`Chip ${chipLabel(d)}`}
                >
                  {selectedChip === d && (
                    <img className={styles.chipHalo} src={A.chipHalo} alt="" draggable={false} />
                  )}
                  <img src={chipSrc(d, 'selector')} alt={chipLabel(d)} draggable={false} />
                </button>
              ))}
              <button type="button" className={styles.chipArrow} aria-label="Next">
                <img src={A.arrowRight} alt="" draggable={false} />
              </button>
            </div>

            <button
              type="button"
              className={styles.rebetBtn}
              onClick={onRebet}
              disabled={!bettingOpen}
              aria-label="ReBet"
            >
              <img src={bettingOpen ? A.rebet : A.rebetDisabled} alt="ReBet" draggable={false} />
            </button>
            </div>
          </footer>

          {dim && <div className={styles.dimBoard} />}

          <div className={styles.animLayer}>
            {showStop && (
              <div className={styles.bannerWrap}>
                <img className={styles.banner} src={A.stop} alt="Stop Betting" draggable={false} />
                <img className={styles.bannerShine} src={A.glowGoldFx} alt="" draggable={false} />
              </div>
            )}
            {(showStart || showStartBanner) && !showStop && (
              <img className={styles.banner} src={A.start} alt="Start Betting" draggable={false} />
            )}
            {showWin && (
              <div className={styles.winFx} key={winFx?.id ?? 'preview'}>
                <div className={styles.winFlash} />
                <img className={styles.winBurst} src={A.burst} alt="" draggable={false} />
                <img className={styles.winBurstB} src={A.burst} alt="" draggable={false} />
                <img className={styles.winVictory} src={A.victory} alt="" draggable={false} />
                <div className={styles.bannerWrap}>
                  <img className={styles.banner} src={A.win} alt="Win" draggable={false} />
                  <img className={styles.bannerShine} src={A.glowGoldFx} alt="" draggable={false} />
                </div>
                <div className={styles.winAmountBox}>
                  <span className={styles.winAmountLabel}>You Win</span>
                  <span className={styles.winAmount}>+{(winCount || winAmount).toLocaleString()}</span>
                </div>
                {Array.from({ length: 14 }, (_, i) => (
                  <span
                    key={i}
                    className={styles.winConfetti}
                    style={{
                      ['--x' as string]: `${8 + (i % 7) * 14}%`,
                      ['--delay' as string]: `${(i % 7) * 0.08}s`,
                      ['--dur' as string]: `${0.9 + (i % 5) * 0.12}s`,
                      ['--hue' as string]: `${(i * 37) % 360}`,
                    }}
                  />
                ))}
                <img className={styles.sparkleA} src={A.sparkle} alt="" draggable={false} />
                <img className={styles.sparkleB} src={A.sparkle} alt="" draggable={false} />
                <img className={styles.sparkleC} src={A.sparkle} alt="" draggable={false} />
                <img className={styles.sparkleD} src={A.sparkle} alt="" draggable={false} />
              </div>
            )}

            {showMachine && (
              <div
                className={`${styles.machineHost} ${
                  phase === 'MACHINE_ENTERING' ? styles.machineEnter : ''
                } ${machineExiting ? styles.machineExit : ''} ${shake ? styles.machineShake : ''}`}
              >
                <img className={styles.machineLayer} src={A.machineBack} alt="" draggable={false} style={{ zIndex: 0 }} />
                <img
                  className={`${styles.machineLayer} ${styles.machineChamberImg}`}
                  src={A.machineChamber}
                  alt=""
                  draggable={false}
                />
                <MixingBalls active={mixing} slowing={slowing} winning={result} />
                <img className={styles.machineLayer} src={A.machineGlass} alt="" draggable={false} style={{ zIndex: 3 }} />
                <img className={styles.machineLayer} src={A.machineFront} alt="" draggable={false} style={{ zIndex: 4 }} />
                <img className={styles.machineLayer} src={A.machineBase} alt="" draggable={false} style={{ zIndex: 5 }} />
                <img className={styles.machineLayer} src={A.resultChannel} alt="" draggable={false} style={{ zIndex: 6 }} />
                <img className={styles.machineLayer} src={A.machineHighlight} alt="" draggable={false} style={{ zIndex: 9 }} />
                <div className={styles.machineTimeHud} aria-hidden>
                  <span className={styles.machineTimeLabel}>Time</span>
                  <span className={styles.machineTimeDigits}>{timeLabel}</span>
                </div>
                {reveal && result != null && (
                  <div className={styles.revealWrap}>
                    <img className={styles.resultHolder} src={A.resultHolder} alt="" draggable={false} />
                    <img className={styles.revealGlow} src={A.glowReveal} alt="" draggable={false} />
                    <img
                      className={`${styles.revealBall} ${phase === 'RESULT_TO_HISTORY' ? styles.revealToHistory : ''}`}
                      src={ballSrc(result, 'reveal')}
                      alt={String(result)}
                      draggable={false}
                    />
                  </div>
                )}
              </div>
            )}

            <div ref={flyLayerRef} className={styles.flyLayer} />
          </div>
          </div>

          {IS_DEV && refOpacity > 0 && (
            <img
              className={styles.refOverlay}
              src={A.reference}
              alt=""
              draggable={false}
              style={{ opacity: refOpacity / 100 }}
            />
          )}
          {IS_DEV && (
            <div className={styles.refHint}>
              Alt+R overlay · B/S/M/X/R/H/P/F anim
            </div>
          )}

          {IS_DEV && previewOpen && onPreview && (
            <div className={styles.devPanel}>
              <div className={styles.devTitle}>Anim Preview (Alt+P)</div>
              {(
                [
                  ['Open', 'BETTING_OPEN'],
                  ['Stop', 'STOP_BETTING'],
                  ['Machine', 'MACHINE_ENTERING'],
                  ['Mix', 'BALLS_MIXING'],
                  ['Reveal', 'RESULT_REVEAL'],
                  ['History', 'RESULT_TO_HISTORY'],
                  ['Settle', 'SETTLEMENT'],
                  ['Win', 'WIN_CELEBRATION'],
                  ['Full', 'FULL_ROUND'],
                ] as const
              ).map(([label, cmd]) => (
                <button key={cmd} type="button" className={styles.devBtn} onClick={() => onPreview(cmd)}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
