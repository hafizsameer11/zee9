import { useRef, useState } from 'react'
import { useWallet } from '../../context/WalletContext'
import {
  JHANDI_SYMBOLS,
  jhandiPayout,
  rollJhandiDice,
  spinRouletteColor,
  type BlackRedChoice,
  type JhandiSymbol,
} from '../engines/dice'
import type { GameComponentProps } from '../types'
import { useDesignScale } from '../hooks/useDesignScale'
import Zee9PremiumFrame from './Zee9PremiumFrame'
import styles from './premiumFrame.module.css'

const STAKES = [10, 20, 50, 100, 500, 1000, 2000, 5000, 10000]

function formatPkr(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function DiceGames({ gameId, bet: defaultBet, onMessage }: GameComponentProps) {
  if (gameId === 'black-red') return <BlackRedGame bet={defaultBet} onMessage={onMessage} gameId={gameId} />
  if (gameId === 'jhandi-munda') return <JhandiGame bet={defaultBet} onMessage={onMessage} gameId={gameId} />
  return null
}

function BlackRedGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef)
  const { debit, credit, canAfford } = useWallet()
  const [betAmount, setBetAmount] = useState(defaultBet)
  const [choice, setChoice] = useState<BlackRedChoice | null>(null)
  const [result, setResult] = useState<BlackRedChoice | null>(null)
  const [spinning, setSpinning] = useState(false)

  const play = () => {
    if (spinning) return
    if (!choice) {
      onMessage?.('Pick a color')
      return
    }
    if (!canAfford(betAmount) || !debit(betAmount)) {
      onMessage?.('Insufficient balance')
      return
    }
    setSpinning(true)
    onMessage?.(null)
    setTimeout(() => {
      const spun = spinRouletteColor()
      setResult(spun)
      setSpinning(false)
      if (spun === choice) {
        credit(betAmount * 2)
        onMessage?.(`🎉 Won PKR ${formatPkr(betAmount * 2)}!`)
      } else {
        onMessage?.(`Lost — ${spun.toUpperCase()}`)
      }
    }, 800)
  }

  return (
    <Zee9PremiumFrame
      viewportRef={viewportRef}
      layout={layout}
      rootClassName={styles.root}
      canvasClassName={styles.canvas}
      title="BLACK RED"
      subtitle="Pick a color and spin the wheel"
      accent="red"
    >
      <div className="h-full flex flex-col gap-6">
        <div className="flex-1 min-h-0 bg-[radial-gradient(ellipse_at_center,#1a0a0a,#0a0603)] border border-white/10 rounded-2xl flex items-center justify-center">
          <div
            className={`size-40 rounded-full border-4 flex items-center justify-center font-black text-2xl uppercase shadow-[0_0_40px_rgba(0,0,0,0.6)] ${
              spinning ? 'animate-spin' : ''
            } ${
              result === 'red'
                ? 'bg-gradient-to-br from-[#ff5252] to-[#b71c1c] border-[#ff8a80] text-white'
                : result === 'black'
                  ? 'bg-gradient-to-br from-[#424242] to-[#0a0a0a] border-white/20 text-white'
                  : 'bg-neutral-800 border-white/20 text-[#a1a1a1]'
            }`}
          >
            {spinning ? '…' : (result?.toUpperCase() ?? 'SPIN')}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {(['red', 'black'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChoice(c)}
              className={`rounded-xl py-5 font-black text-xl border-2 cursor-pointer ${
                choice === c ? 'ring-2 ring-[#f4d98a] ring-offset-2 ring-offset-[#0a0603]' : ''
              } ${c === 'red' ? 'bg-gradient-to-br from-[#e53935] to-[#b71c1c] text-white border-[#ff8a80]' : 'bg-gradient-to-br from-[#37474f] to-[#0a0a0a] text-white border-white/20'}`}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
        <DiceControls betAmount={betAmount} setBetAmount={setBetAmount} onPlay={play} disabled={spinning} label="SPIN" />
      </div>
    </Zee9PremiumFrame>
  )
}

function JhandiGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef)
  const { debit, credit, canAfford } = useWallet()
  const [betAmount, setBetAmount] = useState(defaultBet)
  const [choice, setChoice] = useState<JhandiSymbol | null>(null)
  const [dice, setDice] = useState<JhandiSymbol[] | null>(null)
  const [rolling, setRolling] = useState(false)

  const play = () => {
    if (rolling) return
    if (!choice) {
      onMessage?.('Pick a symbol')
      return
    }
    if (!canAfford(betAmount) || !debit(betAmount)) {
      onMessage?.('Insufficient balance')
      return
    }
    setRolling(true)
    onMessage?.(null)
    setTimeout(() => {
      const rolled = rollJhandiDice()
      setDice(rolled)
      setRolling(false)
      const mult = jhandiPayout(choice, rolled)
      if (mult > 0) {
        credit(betAmount * mult)
        onMessage?.(`🎉 ×${mult} — Won PKR ${formatPkr(betAmount * mult)}!`)
      } else {
        onMessage?.('No match')
      }
    }, 700)
  }

  return (
    <Zee9PremiumFrame
      viewportRef={viewportRef}
      layout={layout}
      rootClassName={styles.root}
      canvasClassName={styles.canvas}
      title="JHANDI MUNDA"
      subtitle="Pick your symbol and roll six dice"
      accent="gold"
    >
      <div className="h-full flex flex-col gap-6">
        <div className="flex-1 min-h-0 bg-[radial-gradient(ellipse_at_center,#2a1810,#0a0603)] border border-white/10 rounded-2xl p-6 flex items-center justify-center">
          <div className="grid grid-cols-3 gap-4">
            {(dice ?? Array(6).fill('?')).map((s, i) => (
              <div
                key={i}
                className={`size-20 rounded-xl bg-gradient-to-br from-[#fff8e1] to-[#ff8f00] border-2 border-[#f4d98a] flex items-center justify-center text-4xl shadow-lg ${
                  rolling ? 'animate-pulse' : ''
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {JHANDI_SYMBOLS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setChoice(s)}
              className={`rounded-xl py-3 text-2xl border-2 cursor-pointer ${
                choice === s ? 'border-[#f4d98a] bg-neutral-800 ring-2 ring-[#d4af37]/50' : 'border-white/10 bg-neutral-900/60'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <DiceControls betAmount={betAmount} setBetAmount={setBetAmount} onPlay={play} disabled={rolling} label="ROLL" />
      </div>
    </Zee9PremiumFrame>
  )
}

function DiceControls({
  betAmount,
  setBetAmount,
  onPlay,
  disabled,
  label,
}: {
  betAmount: number
  setBetAmount: (n: number) => void
  onPlay: () => void
  disabled: boolean
  label: string
}) {
  return (
    <div className="shrink-0 bg-[#0a0603]/80 border border-white/10 rounded-xl p-4 flex items-center gap-4">
      <div className="rounded-full bg-neutral-900 border border-white/10 flex items-center px-2">
        <button type="button" className="size-8 border-0 bg-transparent text-[#a1a1a1] cursor-pointer" disabled={disabled} onClick={() => setBetAmount(Math.max(10, betAmount - 10))}>−</button>
        <span className="font-bold text-sm w-20 text-center">PKR {formatPkr(betAmount)}</span>
        <button type="button" className="size-8 border-0 bg-transparent text-[#a1a1a1] cursor-pointer" disabled={disabled} onClick={() => setBetAmount(Math.min(10000, betAmount + 10))}>+</button>
      </div>
      <div className="flex gap-2">
        {STAKES.map((s) => (
          <button key={s} type="button" disabled={disabled} onClick={() => setBetAmount(s)} className="rounded-lg text-xs border border-white/10 px-3 py-2 text-[#a1a1a1] cursor-pointer">
            {s}
          </button>
        ))}
      </div>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onPlay}
        disabled={disabled}
        className="bg-gradient-to-br from-[#f4d98a] to-[#d4af37] font-black rounded-xl text-[#0a0603] px-10 h-11 border-0 cursor-pointer disabled:opacity-50"
      >
        {label} · PKR {formatPkr(betAmount)}
      </button>
    </div>
  )
}
