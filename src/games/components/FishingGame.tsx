import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { catchSuccess, randomFish, type FishType } from '../engines/fishing'
import type { GameComponentProps } from '../types'
import { useDesignScale } from '../hooks/useDesignScale'
import Zee9PremiumFrame from './Zee9PremiumFrame'
import styles from './premiumFrame.module.css'

type SwimFish = FishType & { swimId: number; x: number; y: number; dir: 1 | -1 }

const TITLES: Record<string, string> = {
  'jackpot-fishing': 'JACKPOT FISHING',
  'ocean-king': 'OCEAN KING',
  'all-star-fishing': 'ALL-STAR FISHING',
}

function formatPkr(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function FishingGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const { id: gameId } = useParams<{ id: string }>()
  const viewportRef = useRef<HTMLDivElement>(null)
  const scale = useDesignScale(viewportRef)
  const { debit, credit, canAfford } = useWallet()
  const [betAmount, setBetAmount] = useState(defaultBet)
  const [fish, setFish] = useState<SwimFish[]>([])
  const [catches, setCatches] = useState(0)
  const [lastWin, setLastWin] = useState(0)
  const idRef = useRef(0)
  const pondRef = useRef<HTMLDivElement>(null)

  const spawn = useCallback(() => {
    const f = randomFish()
    const pond = pondRef.current
    const h = pond?.clientHeight ?? 400
    const w = pond?.clientWidth ?? 800
    idRef.current += 1
    setFish((prev) => [
      ...prev.slice(-14),
      {
        ...f,
        swimId: idRef.current,
        x: Math.random() * Math.max(60, w - 80),
        y: 20 + Math.random() * Math.max(40, h - 80),
        dir: Math.random() < 0.5 ? 1 : -1,
      },
    ])
  }, [])

  useEffect(() => {
    spawn()
    const spawnId = setInterval(spawn, 1600)
    const moveId = setInterval(() => {
      setFish((prev) =>
        prev
          .map((f) => ({ ...f, x: f.x + f.speed * f.dir * 4 }))
          .filter((f) => f.x > -100 && f.x < 1200),
      )
    }, 50)
    return () => {
      clearInterval(spawnId)
      clearInterval(moveId)
    }
  }, [spawn])

  const shoot = (target: SwimFish) => {
    if (!canAfford(betAmount) || !debit(betAmount)) {
      onMessage?.('Insufficient balance')
      return
    }
    setFish((prev) => prev.filter((f) => f.swimId !== target.swimId))
    if (catchSuccess()) {
      const win = Math.round(betAmount * target.multiplier * 100) / 100
      credit(win)
      setCatches((c) => c + 1)
      setLastWin(win)
      onMessage?.(`🎣 Caught! +PKR ${formatPkr(win)}`)
    } else {
      setLastWin(0)
      onMessage?.('Miss!')
    }
  }

  const title = TITLES[gameId ?? ''] ?? 'FISHING'

  return (
    <Zee9PremiumFrame
      viewportRef={viewportRef}
      scale={scale}
      rootClassName={styles.root}
      canvasClassName={styles.canvas}
      activeGameId={gameId ?? 'jackpot-fishing'}
      title={title}
      subtitle="Tap fish to shoot — bigger fish, bigger multipliers"
      accent="blue"
    >
      <div className="h-full flex flex-col gap-4">
        <div className="flex gap-4 shrink-0">
          <div className="flex-1 rounded-xl bg-neutral-900/80 border border-white/10 p-3 flex flex-col items-center">
            <span className="text-[#a1a1a1] text-[10px] uppercase">Catches</span>
            <span className="font-black text-2xl text-[#1bd6a0]">{catches}</span>
          </div>
          <div className="flex-1 rounded-xl bg-neutral-900/80 border border-white/10 p-3 flex flex-col items-center">
            <span className="text-[#a1a1a1] text-[10px] uppercase">Shot Cost</span>
            <span className="font-black text-2xl text-[#f4d98a]">PKR {formatPkr(betAmount)}</span>
          </div>
          <div className="flex-1 rounded-xl bg-neutral-900/80 border border-white/10 p-3 flex flex-col items-center">
            <span className="text-[#a1a1a1] text-[10px] uppercase">Last Win</span>
            <span className="font-black text-2xl text-[#5ea0f2]">PKR {formatPkr(lastWin)}</span>
          </div>
        </div>

        <div
          ref={pondRef}
          className="flex-1 min-h-0 relative overflow-hidden rounded-2xl border border-[#1565c0]/30 bg-[radial-gradient(ellipse_at_top,#0d47a1,#020810)]"
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(94,160,242,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(94,160,242,0.08)_1px,transparent_1px)] bg-[length:40px_40px]" />
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#004d40]/60 to-transparent pointer-events-none" />
          {fish.map((f) => (
            <button
              key={f.swimId}
              type="button"
              className="absolute border-0 bg-transparent cursor-pointer p-0 transition-transform hover:scale-110"
              style={{
                left: f.x,
                top: f.y,
                fontSize: f.size,
                transform: `scaleX(${f.dir})`,
              }}
              onClick={() => shoot(f)}
            >
              <span className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">{f.emoji}</span>
              <span className="block text-center text-[10px] font-bold text-[#f4d98a] mt-0.5">{f.multiplier}×</span>
            </button>
          ))}
        </div>

        <div className="shrink-0 bg-[#0a0603]/80 border border-white/10 rounded-xl p-3 flex items-center gap-3">
          <span className="text-[#a1a1a1] text-xs">Bet per shot</span>
          {[50, 100, 500, 1000].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setBetAmount(s)}
              className={`rounded-lg text-xs border border-white/10 px-3 py-2 cursor-pointer ${
                betAmount === s ? 'bg-neutral-800 text-white' : 'text-[#a1a1a1]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </Zee9PremiumFrame>
  )
}
