import { getDesignCanvasStyle, type DesignLayout } from '../hooks/useDesignScale'
import type { RefObject } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  Diamond,
  Gift,
  Hash,
  History,
  Info,
  Layers,
  MessageCircle,
  Send,
  Settings,
  ShieldCheck,
  Ticket,
  Timer,
  Trophy,
  Wallet,
} from 'lucide-react'
import type { WingoBet, WingoBetType, WingoResult } from '../engines/wingo'
import { ColorDot, WingoBall, WingoBallIdle, ballColorForNumber } from './wingoGfx'
import './wingo.tw.css'

const LIVE_WINS = [
  { name: 'Ahmed_K', amount: 4500, pick: 'Violet' },
  { name: 'Sana92', amount: 900, pick: 'Number 3' },
  { name: 'Bilal.R', amount: 2000, pick: 'BIG' },
]

const STAKES = [50, 100, 500, 1000]

function formatPkr(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatTime(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function betLabel(bet: WingoBet): string {
  if (bet.type === 'number') return `Number ${bet.value}`
  return bet.type.charAt(0).toUpperCase() + bet.type.slice(1)
}

function betChipClass(type: WingoBetType): string {
  if (type === 'green') return 'bg-gradient-to-br from-[#5cc264] to-[#2e7d32]'
  if (type === 'red') return 'bg-gradient-to-br from-[#ff5c58] to-[#c41e3a]'
  if (type === 'violet') return 'bg-gradient-to-br from-[#c765e0] to-[#9c27b0]'
  return 'bg-neutral-700'
}

function maxPayout(bet: WingoBet): number {
  if (bet.type === 'number') return bet.amount * 9
  if (bet.type === 'violet') return bet.amount * 4.5
  return bet.amount * 2
}

export type WingoDesignUIProps = {
  viewportRef: RefObject<HTMLDivElement | null>
  layout: DesignLayout
  designW: number
  designH: number
  rootClassName: string
  canvasClassName: string
  title: string
  balance: number
  betAmount: number
  onBetAmount: (n: number) => void
  period: string
  timeLeft: number
  roundMs: number
  result: WingoResult | null
  history: WingoResult[]
  pending: (WingoBet & { id: number })[]
  selected: { type: WingoBetType; value?: number } | null
  onSelect: (sel: { type: WingoBetType; value?: number } | null) => void
  onPlaceBet: () => void
  onHome: () => void
  canBet: boolean
}

export default function WingoDesignUI({
  viewportRef,
  layout,
  designW,
  designH,
  rootClassName,
  canvasClassName,
  title,
  balance,
  betAmount,
  onBetAmount,
  period,
  timeLeft,
  roundMs,
  result,
  history,
  pending,
  selected,
  onSelect,
  onPlaceBet,
  onHome,
  canBet,
}: WingoDesignUIProps) {
  const secs = Math.ceil(timeLeft / 1000)
  const urgent = secs <= 5
  const progress = timeLeft / roundMs
  const ringDeg = Math.round(progress * 360)
  const ringColor = urgent ? '#ff6467' : '#a3a3a3'
  const heroColor = result?.color ?? 'green'
  const heroRing = `conic-gradient(from 0deg, ${heroColor === 'green' ? '#1bd6a0' : heroColor === 'red' ? '#ff6467' : '#c765e0'} 0deg, ${heroColor === 'green' ? '#1bd6a0' : heroColor === 'red' ? '#ff6467' : '#c765e0'} ${ringDeg}deg, #262626 ${ringDeg}deg)`
  const totalStake = pending.reduce((s, b) => s + b.amount, 0)
  const potentialWin = pending.reduce((s, b) => s + maxPayout(b), 0)
  const periodShort = period.slice(-6)

  const toggleSelect = (type: WingoBetType, value?: number) => {
    if (selected?.type === type && selected.value === value) onSelect(null)
    else onSelect({ type, value })
  }

  return (
    <div className={rootClassName} ref={viewportRef}>
      <div
        className={canvasClassName}
        style={getDesignCanvasStyle(layout, designW, designH)}
      >
        <div className="game-ui bg-[radial-gradient(ellipse_at_top,oklch(0.22_0.04_40),oklch(0.145_0.01_40))] flex flex-col w-full h-full overflow-hidden text-neutral-50">
          <header className="backdrop-blur-md shrink-0 bg-[#0a0603]/80 border-white/10 border-b border-solid flex px-8 py-4 justify-between items-center">
            <button type="button" className="flex items-center gap-3 border-0 bg-transparent p-0 cursor-pointer" onClick={onHome}>
              <div className="size-10 bg-gradient-to-br from-[#f4d98a] to-[#d4af37] shadow-[0_0_18px_rgba(212,175,55,0.5)] rounded-xl flex justify-center items-center">
                <Diamond className="size-5 text-[#0a0603]" />
              </div>
              <span className="bg-gradient-to-r from-[#f4d98a] to-[#d4af37] bg-clip-text text-transparent font-black text-2xl leading-8 tracking-tight">
                Zee9
              </span>
            </button>
            <div className="flex items-center gap-3">
              <div className="shadow-[0_0_16px_rgba(212,175,55,0.25)] rounded-full bg-[#0a0603]/70 border-[#d4af37]/50 border border-solid flex px-4 py-2 items-center gap-2">
                <Wallet className="size-4 text-[#d4af37]" />
                <span className="font-bold text-[#f4d98a] text-sm">PKR {formatPkr(balance)}</span>
              </div>
              <button type="button" className="size-9 rounded-full bg-neutral-800 text-[#a1a1a1] border-white/10 border border-solid flex justify-center items-center">
                <History className="size-4" />
              </button>
              <button type="button" className="size-9 rounded-full bg-neutral-800 text-[#a1a1a1] border-white/10 border border-solid flex justify-center items-center">
                <Settings className="size-4" />
              </button>
            </div>
          </header>

          <div className="game-body min-h-0 flex flex-1">
            <aside className="game-sidebar game-sidebar-wide shrink-0 flex flex-col min-h-0">
              <div className="game-panel backdrop-blur-md bg-[#0a0603]/60 border-white/10 border border-solid flex-1 flex flex-col gap-3 rounded-xl overflow-y-auto min-h-0">
                <div>
                  <div className="text-neutral-50 text-base flex items-center gap-2 font-semibold">
                    <BookOpen className="size-4 text-[#a1a1a1]" />
                    How to Play
                  </div>
                  <p className="text-[#a1a1a1] text-xs mt-1">Pick and win big</p>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-bold uppercase text-[#a1a1a1] text-xs tracking-wide">Color</span>
                  {(['green', 'red', 'violet'] as const).map((c) => (
                    <div key={c} className="rounded-lg bg-neutral-800/60 border-white/10 border border-solid flex p-2 justify-between items-center">
                      <div className="flex items-center gap-2">
                        <ColorDot color={c} />
                        <span className="font-semibold text-xs capitalize">{c}</span>
                      </div>
                      <span className="font-bold text-[#1bd6a0] text-xs">{c === 'violet' ? '4.5×' : '2×'}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-bold uppercase text-[#a1a1a1] text-xs tracking-wide">Size</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-neutral-800/60 border-white/10 border border-solid flex p-2 flex-col items-center">
                      <span className="font-bold text-xs">BIG</span>
                      <span className="text-[#a1a1a1] text-[10px]">5–9 · 2×</span>
                    </div>
                    <div className="rounded-lg bg-neutral-800/60 border-white/10 border border-solid flex p-2 flex-col items-center">
                      <span className="font-bold text-xs">SMALL</span>
                      <span className="text-[#a1a1a1] text-[10px]">0–4 · 2×</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-neutral-800/40 border-white/10 border border-solid p-3 flex flex-col gap-1">
                  <span className="font-bold text-xs">Number 0–9</span>
                  <span className="text-[#a1a1a1] text-[11px]">Match exact winning number</span>
                  <span className="font-black text-[#f4d98a] text-lg">9× payout</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-bold uppercase text-[#a1a1a1] text-xs tracking-wide">Quick Tips</span>
                  {[
                    { Icon: Timer, text: 'Bets lock 5s before draw' },
                    { Icon: Layers, text: 'Combine color + number picks' },
                    { Icon: ShieldCheck, text: 'Provably fair results' },
                  ].map(({ Icon, text }) => (
                    <div key={text} className="rounded-lg bg-neutral-800/60 border-white/10 border border-solid flex p-2 items-center gap-2">
                      <Icon className="size-4 shrink-0 text-[#a1a1a1]" />
                      <span className="text-[#a1a1a1] text-[11px]">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <main className="game-main min-w-0 flex flex-col items-center flex-1 min-h-0">
              <div className="flex justify-between items-end w-full shrink-0">
                <div className="flex flex-col gap-1">
                  <h1 className="bg-gradient-to-b from-[#fbe6a8] via-[#e8c766] to-[#c99b2e] bg-clip-text text-transparent drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] font-black text-5xl leading-tight tracking-tighter">
                    {title}
                  </h1>
                  <p className="text-[#a1a1a1] text-sm">Pick color, size or number — 30s rounds</p>
                </div>
                <div className={`rounded-full border border-solid flex px-4 py-2 items-center gap-2 ${urgent ? 'bg-[#ff6467]/20 border-[#ff6467]/50' : 'bg-[#1bd6a0]/15 border-[#1bd6a0]/40'}`}>
                  <span className={`size-2.5 animate-pulse rounded-full ${urgent ? 'bg-[#ff6467]' : 'bg-[#1bd6a0]'}`} />
                  <span className={`font-bold text-sm tracking-wide ${urgent ? 'text-[#ff6467]' : 'text-[#1bd6a0]'}`}>
                    LIVE ROUND
                  </span>
                </div>
              </div>

              <div className="flex justify-center items-end gap-12 w-full shrink-0">
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-full bg-[#0a0603]/70 border-white/10 border border-solid flex px-4 py-1.5 items-center gap-2">
                    <Hash className="size-3.5 text-[#a1a1a1]" />
                    <span className="font-bold text-neutral-50 text-sm">Period {periodShort}</span>
                  </div>
                  <div
                    className="relative size-48 rounded-full flex p-2 justify-center items-center shadow-[0_0_40px_rgba(27,214,160,0.35)]"
                    style={{ background: heroRing }}
                  >
                    {result ? (
                      <WingoBall number={result.number} color={result.color} size="hero" />
                    ) : (
                      <WingoBallIdle size="hero" />
                    )}
                  </div>
                  <span className="font-semibold uppercase text-[#a1a1a1] text-xs tracking-wide">
                    {result ? `${result.color.toUpperCase()} · ${result.size.toUpperCase()}` : 'Winning Number'}
                  </span>
                </div>
                <div className="flex pb-4 flex-col items-center gap-2">
                  <span className="font-bold uppercase text-[#a1a1a1] text-[11px] tracking-widest">Time Left</span>
                  <div
                    className="relative size-24 rounded-full flex p-1.5 justify-center items-center shadow-[0_0_20px_rgba(0,0,0,0.4)]"
                    style={{ background: `conic-gradient(from 0deg, ${ringColor} 0deg, ${ringColor} ${ringDeg}deg, #262626 ${ringDeg}deg)` }}
                  >
                    <div className="size-full rounded-full bg-[#0a0603] flex flex-col justify-center items-center">
                      <Clock className={`size-4 mb-0.5 ${urgent ? 'text-[#ff6467]' : 'text-[#a1a1a1]'}`} />
                      <span className={`tabular-nums font-black text-xl ${urgent ? 'text-[#ff6467]' : 'text-neutral-50'}`}>
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-full bg-neutral-800 w-32 h-1.5 overflow-hidden">
                    <div className="rounded-full bg-[#a1a1a1] h-full transition-all" style={{ width: `${progress * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full shrink-0">
                {(['green', 'red', 'violet'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleSelect(c)}
                    disabled={!canBet}
                    className={`bg-gradient-to-br shadow-lg transition font-bold rounded-xl text-white flex py-2.5 justify-center items-center flex-1 gap-2 border-0 cursor-pointer disabled:opacity-45 ${
                      c === 'green' ? 'from-[#5cc264] to-[#2e7d32]' : c === 'red' ? 'from-[#ff5c58] to-[#c41e3a]' : 'from-[#c765e0] to-[#9c27b0]'
                    } ${selected?.type === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0603]' : ''}`}
                  >
                    <ColorDot color={c} className="!size-4" />
                    {c.toUpperCase()}
                    <span className="opacity-80 text-xs">{c === 'violet' ? '4.5×' : '2×'}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => toggleSelect('big')}
                  disabled={!canBet}
                  className={`font-bold rounded-xl bg-neutral-800 text-neutral-50 border-white/10 border border-solid flex py-2.5 justify-center items-center flex-1 gap-2 cursor-pointer disabled:opacity-45 ${selected?.type === 'big' ? 'ring-2 ring-white' : ''}`}
                >
                  <ChevronUp className="size-4" /> BIG
                </button>
                <button
                  type="button"
                  onClick={() => toggleSelect('small')}
                  disabled={!canBet}
                  className={`font-bold rounded-xl bg-neutral-800 text-neutral-50 border-white/10 border border-solid flex py-2.5 justify-center items-center flex-1 gap-2 cursor-pointer disabled:opacity-45 ${selected?.type === 'small' ? 'ring-2 ring-white' : ''}`}
                >
                  <ChevronDown className="size-4" /> SMALL
                </button>
              </div>

              <div className="grid grid-cols-5 gap-3 w-full shrink-0">
                {Array.from({ length: 10 }, (_, n) => (
                  <WingoBall
                    key={n}
                    number={n}
                    color={ballColorForNumber(n)}
                    size="grid"
                    selected={selected?.type === 'number' && selected.value === n}
                    onClick={canBet ? () => toggleSelect('number', n) : undefined}
                    className="mx-auto"
                  />
                ))}
              </div>

              <div className="flex mt-auto items-center gap-4 w-full shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#a1a1a1] text-xs">Stake</span>
                  {STAKES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onBetAmount(s)}
                      className={`font-bold rounded-lg text-sm px-3 py-2 border-0 cursor-pointer ${
                        betAmount === s ? 'bg-neutral-50 text-neutral-950' : 'bg-neutral-800 text-neutral-50 border border-white/10'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onPlaceBet}
                  disabled={!canBet || !selected}
                  className="bg-gradient-to-r from-[#f4d98a] via-[#d4af37] to-[#a8842a] shadow-[0_0_28px_rgba(212,175,55,0.55)] font-black rounded-xl text-[#0a0603] text-base flex py-3 justify-center items-center flex-1 gap-3 border-0 cursor-pointer disabled:opacity-45"
                >
                  <Coins className="size-5" />
                  PLACE BET · PKR {formatPkr(betAmount)}
                </button>
              </div>
            </main>

            <aside className="game-sidebar game-sidebar-wide shrink-0 flex flex-col min-h-0">
              <div className="game-panel backdrop-blur-md bg-[#0a0603]/60 border-white/10 border border-solid rounded-xl flex flex-col gap-2">
                <div className="text-neutral-50 text-sm flex items-center gap-2 font-semibold">
                  <Info className="size-4 text-[#a1a1a1]" /> Round Info
                </div>
                <div className="text-xs flex justify-between">
                  <span className="text-[#a1a1a1]">Current Bets</span>
                  <span className="font-bold">{pending.length}</span>
                </div>
                <div className="text-xs flex justify-between">
                  <span className="text-[#a1a1a1]">Total Stake</span>
                  <span className="font-bold">PKR {formatPkr(totalStake)}</span>
                </div>
                {pending.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {pending.map((b) => (
                      <span
                        key={b.id}
                        className={`font-bold rounded-md text-white text-[10px] px-2 py-1 ${betChipClass(b.type)}`}
                      >
                        {b.type === 'number' ? `NUM ${b.value}` : b.type.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="game-panel backdrop-blur-md bg-[#0a0603]/60 border-white/10 border border-solid rounded-xl">
                <div className="text-neutral-50 text-sm flex items-center gap-2 font-semibold mb-2">
                  <History className="size-4 text-[#a1a1a1]" /> Result History
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {history.length === 0
                    ? Array.from({ length: 12 }, (_, i) => (
                        <span key={i} className="size-8 rounded-full bg-neutral-800/60 border border-white/5" />
                      ))
                    : history.map((h, i) => (
                        <WingoBall key={i} number={h.number} color={h.color} size="history" className="mx-auto" />
                      ))}
                </div>
              </div>

              <div className="game-panel backdrop-blur-md bg-[#0a0603]/60 border-white/10 border border-solid flex-1 flex flex-col gap-2 rounded-xl min-h-0 overflow-y-auto">
                <div className="text-neutral-50 text-sm flex items-center gap-2 font-semibold">
                  <Ticket className="size-4 text-[#a1a1a1]" /> My Bets
                </div>
                {pending.length === 0 ? (
                  <p className="text-[#a1a1a1] text-xs">No bets this round — pick a color, size, or number.</p>
                ) : (
                  pending.map((b) => (
                    <div key={b.id} className="rounded-lg bg-neutral-800/60 border-white/10 border border-solid flex p-2 justify-between items-center">
                      <div className="flex items-center gap-2">
                        {b.type === 'number' ? (
                          <WingoBall number={b.value!} color={ballColorForNumber(b.value!)} size="mini" />
                        ) : (
                          <ColorDot color={b.type as 'green' | 'red' | 'violet'} className="!size-6" />
                        )}
                        <span className="font-semibold text-xs">{betLabel(b)}</span>
                      </div>
                      <span className="font-bold text-xs">PKR {formatPkr(b.amount)}</span>
                    </div>
                  ))
                )}
                {pending.length > 0 && (
                  <div className="text-xs flex pt-1 justify-between">
                    <span className="text-[#a1a1a1]">Potential Win</span>
                    <span className="font-black text-[#1bd6a0]">PKR {formatPkr(Math.round(potentialWin))}</span>
                  </div>
                )}
                <div className="rounded-lg bg-neutral-800/40 border-white/10 border border-solid mt-auto p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Gift className="size-4 text-[#f4d98a]" />
                    <span className="font-bold text-xs">Daily Bonus</span>
                  </div>
                  <span className="text-[#a1a1a1] text-[11px]">Play more rounds to unlock free bets</span>
                  <div className="rounded-full bg-[#0a0603] h-1.5 overflow-hidden">
                    <div className="w-[70%] rounded-full bg-[#a1a1a1] h-full" />
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <footer className="game-footer backdrop-blur-md shrink-0 bg-[#0a0603]/80 border-white/10 border-t border-solid flex px-8 py-3 justify-between items-center gap-6">
            <div className="min-w-0 flex items-center gap-3 overflow-hidden">
              <div className="shrink-0 rounded-full bg-[#1bd6a0]/15 border-[#1bd6a0]/40 border border-solid flex px-3 py-1.5 items-center gap-1.5">
                <Trophy className="size-3.5 text-[#1bd6a0]" />
                <span className="font-bold text-[#1bd6a0] text-xs">LIVE WINS</span>
              </div>
              <div className="whitespace-nowrap text-[#a1a1a1] text-xs flex items-center gap-4 overflow-hidden">
                {LIVE_WINS.map((w, i) => (
                  <span key={w.name}>
                    {i > 0 && <span className="text-[#a1a1a1] mr-4">•</span>}
                    <span className="font-semibold text-neutral-50">{w.name}</span> won{' '}
                    <span className="font-bold text-[#1bd6a0]">PKR {formatPkr(w.amount)}</span> on {w.pick}
                  </span>
                ))}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2 w-80">
              <div className="rounded-full bg-neutral-800 border-white/10 border border-solid flex px-3 py-2 items-center flex-1 gap-2">
                <MessageCircle className="size-4 text-[#a1a1a1]" />
                <input placeholder="Type a message..." className="bg-transparent outline-none text-sm flex-1 min-w-0" readOnly />
              </div>
              <button type="button" className="size-9 rounded-full bg-neutral-800 border-white/10 border border-solid flex justify-center items-center">
                <Send className="size-4" />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
