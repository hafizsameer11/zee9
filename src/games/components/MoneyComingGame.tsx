import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { sound } from '../../lib/sound'
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
import { useDesignScale } from '../hooks/useDesignScale'
import type { GameComponentProps } from '../types'
import MoneyComingDesignUI from './MoneyComingDesignUI'

/** Money Coming reference canvas (fills 16:9 landscape without tall letterbox). */
export const MC_DESIGN_W = 850
export const MC_DESIGN_H = 480

const SPIN_MS = 2200
const MC_SPIN_SFX = '/games/money-coming/spin.mp3'
const MC_CLICK_SFX = '/games/money-coming/click.mp3'

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

export default function MoneyComingGame({ onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, MC_DESIGN_W, MC_DESIGN_H)
  const { balance, debit, credit, canAfford } = useWallet()
  const busyRef = useRef(false)
  const spinAudioRef = useRef<HTMLAudioElement | null>(null)

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
    void sound.unlock()
    void sound.preload(['spin', 'click', 'chip', 'win', 'lose', 'tap', 'whoosh'])
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

  const spin = useCallback(async (opts?: { free?: boolean }) => {
    if (busyRef.current || spinning) return
    const free = opts?.free === true
    if (!free) {
      if (!canAfford(betAmount)) {
        sound.play('error')
        onMessage?.('Insufficient balance')
        return
      }
      if (!debit(betAmount)) {
        sound.play('error')
        onMessage?.('Bet failed')
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
    await new Promise((r) => setTimeout(r, duration))

    const next: [McNumber, McNumber, McNumber] = [randomNumber(), randomNumber(), randomNumber()]
    const nextMult = randomMult()
    setReels(next)
    setMult(nextMult)
    setSpinning(false)
    setWheelSpinning(false)
    stopSpinAudio()
    sound.play('tap', { volume: 0.35 })

    const result = evaluateSpin(next, nextMult, betAmount)
    if (result.kind === 'respin') {
      onMessage?.('RESPIN!')
      playMcSfx(MC_CLICK_SFX, 0.45, () => sound.play('bonus', { volume: 0.45 }))
      window.setTimeout(() => onMessage?.(null), 1200)
      busyRef.current = false
      setShine(false)
      window.setTimeout(() => void spin({ free: true }), 500)
      return
    }

    if (result.win > 0) {
      credit(result.win)
      setLastWin(result.win)
      sound.play('win', { volume: 0.75 })
      sound.play('coin', { volume: 0.4 })
      onMessage?.(`Won Rs ${result.win.toLocaleString()}!`)
      window.setTimeout(() => onMessage?.(null), 2000)
    } else {
      sound.play('lose', { volume: 0.35 })
    }

    setShine(false)
    busyRef.current = false
  }, [betAmount, canAfford, credit, debit, onMessage, spinning, turbo])

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

  return (
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
      onHome={() => {
        playMcSfx(MC_CLICK_SFX, 0.35, () => sound.play('tap', { volume: 0.35 }))
        navigate('/')
      }}
      onSpin={onSpinClick}
      onBetPlus={() => adjustBet(1)}
      onBetMinus={() => adjustBet(-1)}
      onToggleTurbo={toggleTurbo}
      onToggleAuto={toggleAuto}
    />
  )
}
