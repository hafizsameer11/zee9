import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { sound } from '../../lib/sound'
import { getAccess } from '../../api/client'
import { preconnectSlot, serverSlotSpin } from '../lib/serverSpin'
import {
  buildMultStrip,
  buildReelStrip,
  evaluateSpin,
  MC_BET_STEPS,
  randomMult,
  randomNumber,
  type McMult,
  type McNumber,
} from '../engines/moneyComing'
import { MC_ASSETS, MC_AUDIO, preloadMoneyComingAssets } from '../engines/moneyComingAssets'
import { useDesignScale } from '../hooks/useDesignScale'
import { roundLossMessage, roundWinMessage } from '../lib/roundResult'
import type { GameComponentProps } from '../types'
import MoneyComingDesignUI from './MoneyComingDesignUI'
import styles from './moneyComing.module.css'
import AddCashModal from '../../components/s9/modals/AddCashModal'

/** Money Coming reference canvas (fills 16:9 landscape without tall letterbox). */
export const MC_DESIGN_W = 850
export const MC_DESIGN_H = 480

const SPIN_MS = 2200
const MC_SPIN_SFX = MC_AUDIO.spin
const MC_CLICK_SFX = MC_AUDIO.click

function playMcSfx(src: string, volume: number, fallback: () => void) {
  try {
    const audio = new Audio(src)
    audio.volume = volume
    void audio.play().catch(fallback)
    return audio
  } catch {
    fallback()
    return null
  }
}

function MoneyComingLoader({ progress }: { progress: number }) {
  return (
    <div className={styles.loader} aria-busy="true" aria-label="Loading Money Coming">
      <img className={styles.loaderLogo} src={MC_ASSETS.logo} alt="" draggable={false} />
      <div className={styles.loaderTitle}>MONEY COMING</div>
      <div className={styles.loaderBarWrap}>
        <div className={styles.loaderBar} style={{ width: `${progress}%` }} />
      </div>
      <div className={styles.loaderPct}>{progress}% · Preparing game</div>
    </div>
  )
}

export default function MoneyComingGame({ onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, MC_DESIGN_W, MC_DESIGN_H)
  const { balance, credit, canAfford, refresh } = useWallet()
  const busyRef = useRef(false)
  const spinAudioRef = useRef<HTMLAudioElement | null>(null)

  const [ready, setReady] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [showAddCash, setShowAddCash] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [betAmount, setBetAmount] = useState(10)
  const [reels, setReels] = useState<[McNumber, McNumber, McNumber]>([1, 1, 0])
  const [mult, setMult] = useState<McMult>('2x')
  const [spinning, setSpinning] = useState(false)
  const [shine, setShine] = useState(false)
  const [wheelSpinning, setWheelSpinning] = useState(false)
  const [lastWin, setLastWin] = useState(0)
  const [turbo, setTurbo] = useState(false)
  const [auto, setAuto] = useState(false)
  const [strips, setStrips] = useState(() => [buildReelStrip(), buildReelStrip(), buildReelStrip()] as const)
  const [multStrip, setMultStrip] = useState(() => buildMultStrip())
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    preconnectSlot('money-coming')
    let cancelled = false
    void preloadMoneyComingAssets((loaded, total) => {
      if (cancelled) return
      setLoadProgress(Math.max(4, Math.round((loaded / total) * 100)))
    }).then(() => {
      if (cancelled) return
      setLoadProgress(100)
      setReady(true)
    })
    void sound.unlock()
    void sound.preload(['spin', 'click', 'chip', 'win', 'lose', 'tap', 'whoosh'])
    return () => {
      cancelled = true
    }
  }, [])

  const stopSpinAudio = () => {
    const a = spinAudioRef.current
    if (!a) return
    try {
      a.pause()
      a.currentTime = 0
    } catch {
      /* ignore */
    }
    spinAudioRef.current = null
  }

  const spin = useCallback(async (opts?: { free?: boolean; chain?: Array<{
    reels: [McNumber, McNumber, McNumber]
    mult: McMult
    win: number
    kind: 'none' | 'match' | 'respin'
  }> }) => {
    if (busyRef.current || spinning) return
    const free = opts?.free === true
    const live = !!getAccess()
    const chain = opts?.chain

    if (!free && !chain) {
      if (!canAfford(betAmount)) {
        sound.play('error')
        onMessage?.('Insufficient balance')
        return
      }
      if (!live) {
        sound.play('error')
        onMessage?.('Not authenticated')
        return
      }
    }

    busyRef.current = true
    setSpinning(true)
    setShine(true)
    setLastWin(0)
    setWheelSpinning(true)
    onMessage?.(null)
    void sound.unlock()

    stopSpinAudio()
    spinAudioRef.current = playMcSfx(MC_SPIN_SFX, turbo ? 0.35 : 0.5, () => {
      sound.play('spin', { volume: turbo ? 0.4 : 0.55 })
    })
    sound.play('whoosh', { volume: 0.25 })

    setStrips([buildReelStrip(), buildReelStrip(), buildReelStrip()])
    setMultStrip(buildMultStrip())

    const duration = turbo ? 1100 : SPIN_MS

    let next: [McNumber, McNumber, McNumber]
    let nextMult: McMult
    let winAmount = 0
    let kind: 'none' | 'match' | 'respin' = 'none'
    let pendingChain: typeof chain | undefined

    try {
      if (chain && chain.length > 0) {
        // Playback of a server-authored RESPIN step
        await new Promise((r) => setTimeout(r, Math.min(duration, turbo ? 700 : 1200)))
        const step = chain[0]!
        next = step.reels
        nextMult = step.mult
        winAmount = step.win
        kind = step.kind
        pendingChain = chain.slice(1)
      } else if (live && !free) {
        const settled = await serverSlotSpin('money-coming', betAmount)
        if (!settled) throw new Error('Not authenticated')
        const payload = settled.payload || {}
        const steps = payload.steps as
          | Array<{
              reels: [McNumber, McNumber, McNumber]
              mult: McMult
              win: number
              kind: 'none' | 'match' | 'respin'
            }>
          | undefined

        if (steps && steps.length > 1) {
          // Animate first RESPIN, then continue the chain
          await new Promise((r) => setTimeout(r, Math.min(duration, 900)))
          const first = steps[0]!
          next = first.reels
          nextMult = first.mult
          winAmount = first.win
          kind = first.kind
          pendingChain = steps.slice(1)
        } else {
          next = (payload.reels as [McNumber, McNumber, McNumber]) ?? [
            randomNumber(),
            randomNumber(),
            randomNumber(),
          ]
          nextMult = (payload.mult as McMult) ?? '—'
          winAmount = Number(settled.win ?? 0)
          kind = winAmount > 0 ? 'match' : nextMult === 'RESPIN' ? 'respin' : 'none'
          await new Promise((r) => setTimeout(r, Math.min(duration, 900)))
        }

        // Dev parity: visible outcome must re-evaluate to the settled win (final step only)
        if (import.meta.env.DEV && !pendingChain?.length && nextMult !== 'RESPIN') {
          const local = evaluateSpin(next, nextMult, betAmount)
          if (local.win !== winAmount) {
            console.warn('[money-coming] paytable drift', { local: local.win, server: winAmount, next, nextMult })
          }
        }
        await refresh()
      } else if (free) {
        await new Promise((r) => setTimeout(r, duration))
        next = [randomNumber(), randomNumber(), randomNumber()]
        nextMult = randomMult()
        const result = evaluateSpin(next, nextMult, betAmount)
        winAmount = result.win
        kind = result.kind
      } else {
        throw new Error('Not authenticated')
      }
    } catch (e: any) {
      setSpinning(false)
      setWheelSpinning(false)
      setShine(false)
      busyRef.current = false
      stopSpinAudio()
      sound.play('error')
      onMessage?.(e?.message || 'Spin failed')
      return
    }

    setReels(next)
    setMult(nextMult)
    setSpinning(false)
    setWheelSpinning(false)
    stopSpinAudio()
    sound.play('tap', { volume: 0.35 })

    if (kind === 'respin' || (pendingChain && pendingChain.length > 0)) {
      onMessage?.('RESPIN!')
      playMcSfx(MC_CLICK_SFX, 0.45, () => sound.play('bonus', { volume: 0.45 }))
      window.setTimeout(() => onMessage?.(null), 1200)
      busyRef.current = false
      setShine(false)
      const rest = pendingChain && pendingChain.length > 0 ? pendingChain : undefined
      window.setTimeout(() => {
        if (rest) void spin({ free: true, chain: rest })
        else void spin({ free: true })
      }, 500)
      return
    }

    if (winAmount > 0) {
      if (!live) credit(winAmount)
      setLastWin(winAmount)
      sound.play('win', { volume: 0.75 })
      sound.play('coin', { volume: 0.4 })
      onMessage?.(roundWinMessage(winAmount))
      window.setTimeout(() => onMessage?.(null), 2000)
    } else {
      sound.play('lose', { volume: 0.35 })
      onMessage?.(roundLossMessage(betAmount))
      window.setTimeout(() => onMessage?.(null), 2000)
    }

    setShine(false)
    busyRef.current = false
  }, [betAmount, canAfford, credit, onMessage, refresh, spinning, turbo])

  useEffect(() => {
    if (!auto || spinning || busyRef.current) return
    autoTimer.current = setTimeout(() => void spin(), 900)
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current)
    }
  }, [auto, spinning, spin, lastWin])

  useEffect(() => () => stopSpinAudio(), [])

  const adjustBet = (dir: 1 | -1) => {
    if (spinning) return
    void sound.unlock()
    playMcSfx(MC_CLICK_SFX, 0.4, () => sound.play('chip', { volume: 0.4 }))
    setBetAmount((b) => {
      const i = MC_BET_STEPS.findIndex((s) => s >= b)
      const idx = i === -1 ? MC_BET_STEPS.length - 1 : idxClamp(i, dir)
      return MC_BET_STEPS[idx]!
    })
  }

  function idxClamp(i: number, dir: 1 | -1) {
    return Math.max(0, Math.min(MC_BET_STEPS.length - 1, i + dir))
  }

  const toggleTurbo = () => {
    void sound.unlock()
    playMcSfx(MC_CLICK_SFX, 0.4, () => sound.play('click', { volume: 0.4 }))
    setTurbo((v) => !v)
  }

  const toggleAuto = () => {
    void sound.unlock()
    playMcSfx(MC_CLICK_SFX, 0.4, () => sound.play('click', { volume: 0.4 }))
    setAuto((v) => !v)
  }

  const onSpinClick = () => {
    void sound.unlock()
    playMcSfx(MC_CLICK_SFX, 0.45, () => sound.play('click', { volume: 0.45 }))
    void spin()
  }

  if (!ready) {
    return (
      <div className={styles.root} ref={viewportRef}>
        <MoneyComingLoader progress={loadProgress} />
      </div>
    )
  }

  const goHome = () => {
    playMcSfx(MC_CLICK_SFX, 0.35, () => sound.play('tap', { volume: 0.35 }))
    navigate('/home')
  }

  return (
    <>
      <MoneyComingDesignUI
        viewportRef={viewportRef}
        layout={layout}
        balance={balance}
        betAmount={betAmount}
        reels={reels}
        mult={mult}
        strips={strips}
        multStrip={multStrip}
        spinning={spinning}
        shine={shine}
        wheelSpinning={wheelSpinning}
        lastWin={lastWin}
        turbo={turbo}
        auto={auto}
        menuOpen={menuOpen}
        onHome={goHome}
        onAddCash={() => {
          playMcSfx(MC_CLICK_SFX, 0.4, () => sound.play('click', { volume: 0.4 }))
          setMenuOpen(false)
          setShowAddCash(true)
        }}
        onToggleMenu={() => {
          playMcSfx(MC_CLICK_SFX, 0.35, () => sound.play('tap', { volume: 0.35 }))
          setMenuOpen((v) => !v)
        }}
        onSpin={onSpinClick}
        onBetPlus={() => adjustBet(1)}
        onBetMinus={() => adjustBet(-1)}
        onToggleTurbo={toggleTurbo}
        onToggleAuto={toggleAuto}
      />
      {showAddCash && <AddCashModal onClose={() => setShowAddCash(false)} />}
    </>
  )
}
