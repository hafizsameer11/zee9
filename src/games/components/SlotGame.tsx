import { useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { useWallet } from '../../context/WalletContext'
import { SLOT_CONFIGS, slotPayout, spinReels, type SlotSymbol } from '../engines/slot'
import type { GameComponentProps } from '../types'
import { useDesignScale } from '../hooks/useDesignScale'
import Zee9PremiumFrame from './Zee9PremiumFrame'
import styles from './premiumFrame.module.css'

const STAKES = [50, 100, 500, 1000]

function formatPkr(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function SlotGame({ gameId, bet: defaultBet, onMessage }: GameComponentProps) {
  const config = SLOT_CONFIGS[gameId] ?? SLOT_CONFIGS['crazy777']!
  const viewportRef = useRef<HTMLDivElement>(null)
  const scale = useDesignScale(viewportRef)
  const { debit, credit, canAfford } = useWallet()
  const [betAmount, setBetAmount] = useState(defaultBet)
  const [reels, setReels] = useState<[SlotSymbol, SlotSymbol, SlotSymbol] | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [lastWin, setLastWin] = useState(0)
  const [won, setWon] = useState(false)

  const spin = () => {
    if (spinning) return
    if (!canAfford(betAmount) || !debit(betAmount)) {
      onMessage?.('Insufficient balance')
      return
    }
    setSpinning(true)
    setWon(false)
    onMessage?.(null)
    setTimeout(() => {
      const result = spinReels(config)
      setReels(result)
      setSpinning(false)
      const payout = slotPayout(result, betAmount)
      if (payout > 0) {
        credit(payout)
        setLastWin(payout)
        setWon(true)
        onMessage?.(`🎉 Won PKR ${formatPkr(payout)}!`)
      } else {
        setLastWin(0)
        onMessage?.('No match — spin again')
      }
    }, 900)
  }

  const display = reels ?? [config.symbols[0]!, config.symbols[1]!, config.symbols[2]!]

  return (
    <Zee9PremiumFrame
      viewportRef={viewportRef}
      scale={scale}
      rootClassName={styles.root}
      canvasClassName={styles.canvas}
      activeGameId={gameId}
      title={config.title.toUpperCase()}
      subtitle="Match symbols across the reels to win"
      accent="gold"
    >
      <div className="h-full flex flex-col gap-6">
        <div className="flex-1 min-h-0 relative bg-[radial-gradient(ellipse_at_center,#2a1520,#0a0603)] border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-8 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:32px_32px]" />
          <div className="relative flex gap-6 items-center justify-center">
            {display.map((sym, i) => (
              <div
                key={`${sym.id}-${i}`}
                className={`size-32 rounded-2xl flex items-center justify-center text-6xl font-black border border-white/10 shadow-[inset_0_4px_12px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.5)] ${
                  spinning ? 'animate-pulse blur-[2px] scale-95' : ''
                } ${won ? 'ring-2 ring-[#f4d98a] shadow-[0_0_30px_rgba(212,175,55,0.5)]' : ''}`}
                style={{
                  background: 'radial-gradient(circle at 35% 28%, #3a2830, #1a1010)',
                }}
              >
                {sym.label}
              </div>
            ))}
          </div>
          {won && lastWin > 0 && (
            <div className="relative rounded-full bg-[#1bd6a0]/15 border border-[#1bd6a0]/40 px-6 py-2 font-bold text-[#1bd6a0] text-lg">
              WIN · PKR {formatPkr(lastWin)}
            </div>
          )}
        </div>

        <div className="shrink-0 bg-[#0a0603]/80 border border-white/10 rounded-xl p-4 flex items-center gap-4">
          <div className="rounded-full bg-neutral-900 border border-white/10 flex items-center gap-2 px-2">
            <button
              type="button"
              className="size-8 text-[#a1a1a1] border-0 bg-transparent cursor-pointer disabled:opacity-40"
              disabled={spinning}
              onClick={() => setBetAmount((b) => Math.max(50, b - 50))}
            >
              −
            </button>
            <span className="font-bold text-sm w-20 text-center">PKR {formatPkr(betAmount)}</span>
            <button
              type="button"
              className="size-8 text-[#a1a1a1] border-0 bg-transparent cursor-pointer disabled:opacity-40"
              disabled={spinning}
              onClick={() => setBetAmount((b) => Math.min(5000, b + 50))}
            >
              +
            </button>
          </div>
          <div className="flex gap-2">
            {STAKES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={spinning}
                onClick={() => setBetAmount(s)}
                className={`rounded-lg text-xs border border-white/10 px-3 py-2 cursor-pointer ${
                  betAmount === s ? 'bg-neutral-800 text-white' : 'text-[#a1a1a1]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="text-right mr-2">
            <div className="text-[#a1a1a1] text-[10px] uppercase">Last Win</div>
            <div className="font-bold text-[#1bd6a0] text-sm">PKR {formatPkr(lastWin)}</div>
          </div>
          <button
            type="button"
            onClick={spin}
            disabled={spinning}
            className="bg-gradient-to-br from-[#f4d98a] to-[#d4af37] shadow-[0_0_24px_rgba(212,175,55,0.45)] font-black rounded-xl text-[#0a0603] text-lg px-10 h-12 border-0 cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <RotateCw className={`size-5 ${spinning ? 'animate-spin' : ''}`} />
            SPIN
          </button>
        </div>
      </div>
    </Zee9PremiumFrame>
  )
}
