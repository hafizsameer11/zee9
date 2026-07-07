import type { RefObject } from 'react'
import {
  BookOpen,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Diamond,
  Dices,
  History,
  Lock,
  MessageCircle,
  Radio,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Wallet,
} from 'lucide-react'
import type { UpDownChoice } from '../engines/dice'
import { getDesignCanvasStyle, type DesignLayout } from '../hooks/useDesignScale'
import { IllustratedDice, choiceLabel, sumHistoryClass } from './upDownGfx'
import './upDown.tw.css'

const STAKES = [50, 100, 500, 1000]

type LastResult = { won: boolean; sum: number; win: number; pick: UpDownChoice }

type LiveFeedItem = {
  initials: string
  name: string
  bet: number
  pick: string
  status: 'won' | 'lost' | 'rolling'
}

function formatPkr(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export type UpDownDesignUIProps = {
  viewportRef: RefObject<HTMLDivElement | null>
  layout: DesignLayout
  rootClassName: string
  canvasClassName: string
  balance: number
  betAmount: number
  choice: UpDownChoice | null
  dice: [number, number] | null
  rolling: boolean
  sum: number | null
  history: number[]
  roundNo: number
  lastResult: LastResult | null
  liveFeed: LiveFeedItem[]
  liveWins: { name: string; amount: number; pick: string }[]
  potentialWin: number
  onChoice: (c: UpDownChoice) => void
  onBetAmount: (n: number) => void
  onRoll: () => void
  onHome: () => void
}

function zoneButtonClass(selected: boolean, zone: UpDownChoice): string {
  const base = 'group rounded-2xl bg-neutral-800/70 border-2 border-solid flex p-4 flex-col items-center gap-2 cursor-pointer transition-all border-transparent'
  if (!selected) return base
  if (zone === 'up') return `${base} ring-2 ring-[#ffeb3b] shadow-[0_0_20px_rgba(255,235,59,0.3)]`
  if (zone === 'seven') return `${base} ring-2 ring-[#fbc02d] shadow-[0_0_20px_rgba(251,192,45,0.35)]`
  return `${base} ring-2 ring-[#f57f17] shadow-[0_0_20px_rgba(245,127,23,0.35)]`
}

export default function UpDownDesignUI({
  viewportRef,
  layout,
  rootClassName,
  canvasClassName,
  balance,
  betAmount,
  choice,
  dice,
  rolling,
  sum,
  history,
  roundNo,
  lastResult,
  liveFeed,
  liveWins,
  potentialWin,
  onChoice,
  onBetAmount,
  onRoll,
  onHome,
}: UpDownDesignUIProps) {
  const d1 = rolling ? '?' : (dice?.[0] ?? '?')
  const d2 = rolling ? '?' : (dice?.[1] ?? '?')
  const displaySum = sum ?? (lastResult?.sum ?? 8)

  return (
    <div className={rootClassName} ref={viewportRef}>
      <div
        className={canvasClassName}
        style={getDesignCanvasStyle(layout)}
      >
        <div className="game-ui bg-[radial-gradient(circle_at_50%_-10%,oklch(0.28_0.06_40),oklch(0.145_0.02_30))] min-h-full text-neutral-50 flex flex-col w-full h-full overflow-hidden">
          <header className="border-white/10 border-b border-solid flex px-8 py-4 justify-between items-center shrink-0 bg-[#0a0603]/60 backdrop-blur-sm">
            <button type="button" className="flex items-center gap-2 border-0 bg-transparent p-0 cursor-pointer" onClick={onHome}>
              <div className="size-9 bg-gradient-to-br from-[#f4d98a] to-[#d4af37] rotate-45 shadow-[0_0_16px_rgba(212,175,55,0.4)] rounded-lg flex justify-center items-center">
                <Diamond className="size-4 -rotate-45 text-[#0a0603]" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-[#f4d98a] to-[#d4af37] bg-clip-text text-transparent">
                Zee9
              </span>
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-[#f4d98a] to-[#d4af37] shadow-[0_0_16px_rgba(212,175,55,0.4)] font-bold rounded-full text-[#0a0603] text-sm flex px-4 py-2 items-center gap-2">
                <Wallet className="size-4" />
                PKR {formatPkr(balance)}
              </div>
              <button type="button" className="size-9 rounded-full bg-neutral-800 text-[#a1a1a1] border-0 flex justify-center items-center">
                <History className="size-4" />
              </button>
              <button type="button" className="size-9 rounded-full bg-neutral-800 text-[#a1a1a1] border-0 flex justify-center items-center">
                <Settings className="size-4" />
              </button>
            </div>
          </header>

          <div className="game-body min-h-0 flex flex-1">
            <aside className="game-sidebar shrink-0 flex flex-col">
              <div className="game-panel bg-neutral-900/80 border border-white/10 rounded-xl flex flex-col gap-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <BookOpen className="size-4 text-[#f57f17]" /> How to Play
                </div>
                {[
                  'Pick 7 UP, 7 DOWN or Lucky 7 and set your stake.',
                  'Roll two dice — the sum decides the result.',
                  'Match your zone to win the payout.',
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="size-5 shrink-0 font-bold rounded-full bg-neutral-800 text-[11px] flex justify-center items-center">{i + 1}</span>
                    <span className="text-[#a1a1a1] text-xs">{t}</span>
                  </div>
                ))}
              </div>
              <div className="game-panel bg-neutral-900/80 border border-white/10 rounded-xl flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  <Target className="size-4 text-[#f57f17]" /> Bet Zones
                </div>
                {[
                  { icon: ChevronUp, label: '7 UP · 8–12', mult: '2×', color: 'text-[#fbc02d]' },
                  { icon: ChevronDown, label: '7 DOWN · 2–6', mult: '2×', color: 'text-[#f57f17]' },
                  { icon: Sparkles, label: 'Lucky 7 · exact', mult: '5×', color: 'text-[#ffeb3b]' },
                ].map((row) => (
                  <div key={row.label} className="rounded-lg bg-neutral-800/60 flex px-3 py-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <row.icon className={`size-4 ${row.color}`} />
                      <span className="font-medium text-xs">{row.label}</span>
                    </div>
                    <span className={`font-bold text-xs ${row.color}`}>{row.mult}</span>
                  </div>
                ))}
              </div>
              <div className="game-panel bg-neutral-900/80 border border-white/10 rounded-xl flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShieldCheck className="size-4 text-[#f57f17]" /> Provably Fair
                </div>
                <div className="text-[#a1a1a1] text-xs flex items-center gap-2"><Lock className="size-3.5" /> Dice locked before roll</div>
                <div className="text-[#a1a1a1] text-xs flex items-center gap-2"><CheckSquare className="size-3.5" /> Verifiable roll seed</div>
                <div className="text-[#a1a1a1] text-xs flex items-center gap-2"><RefreshCw className="size-3.5" /> New round every 12s</div>
              </div>
              <div className="game-panel bg-neutral-900/80 border border-white/10 rounded-xl mt-auto flex flex-col gap-2">
                <div className="text-xs flex justify-between">
                  <span className="text-[#a1a1a1]">Your Win Rate</span>
                  <span className="font-bold text-[#fbc02d]">57%</span>
                </div>
                <div className="rounded-full bg-neutral-800 h-1.5 overflow-hidden">
                  <div className="w-[57%] bg-gradient-to-r from-[#f57f17] to-[#ffeb3b] rounded-full h-full" />
                </div>
              </div>
            </aside>

            <main className="game-main flex flex-col flex-1 min-h-0 min-w-0">
              <div className="flex justify-between items-start shrink-0">
                <div>
                  <h1 className="bg-gradient-to-r from-[#ffeb3b] via-[#fbc02d] to-[#f57f17] bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(245,127,23,0.4)] font-extrabold text-5xl tracking-tight">
                    7 UP DOWN
                  </h1>
                  <p className="text-[#a1a1a1] text-sm">Roll the dice — bet above, below or exactly 7</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold rounded-full text-xs flex px-3 py-1.5 items-center gap-2 ${rolling ? 'bg-[#ff6467]/20 text-[#ff6467]' : 'bg-[#1bd6a0]/15 text-[#1bd6a0]'}`}>
                    <span className={`size-2 rounded-full ${rolling ? 'bg-[#ff6467] animate-pulse' : 'bg-[#1bd6a0]'}`} />
                    {rolling ? 'ROLLING' : 'LIVE ROUND'}
                  </span>
                  <span className="font-medium rounded-full bg-neutral-800 text-[#a1a1a1] text-xs px-3 py-1.5"># Round {roundNo}</span>
                </div>
              </div>

              <div className="game-main-inner bg-[radial-gradient(circle_at_50%_20%,oklch(0.26_0.05_50),oklch(0.19_0.02_35))] relative border border-white/10 rounded-2xl p-6 flex-1 min-h-0 flex flex-col justify-center items-center gap-6">
                <div className="flex items-center gap-10">
                  <IllustratedDice value={d1} rolling={rolling} tilt="left" />
                  <IllustratedDice value={d2} rolling={rolling} tilt="right" />
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="relative size-40 bg-gradient-to-br from-[#ffeb3b] via-[#fbc02d] to-[#f57f17] shadow-[0_0_50px_rgba(255,235,59,0.55),inset_0_6px_16px_rgba(255,255,255,0.55),inset_0_-10px_20px_rgba(0,0,0,0.3)] rounded-full flex justify-center items-center">
                    <div className="size-10 blur-md rounded-full bg-white/40 absolute left-8 top-5" aria-hidden />
                    <span className="drop-shadow-sm font-black text-[#0a0603] text-7xl">{displaySum}</span>
                  </div>
                  {lastResult && !rolling && (
                    <span
                      className={`font-extrabold rounded-full text-sm px-5 py-2 ${
                        lastResult.won
                          ? 'bg-gradient-to-r from-[#fbc02d] to-[#f57f17] shadow-[0_0_20px_rgba(251,192,45,0.5)] text-[#0a0603]'
                          : 'bg-[#c41e3a]/20 text-[#ff6467] border border-[#c41e3a]/40'
                      }`}
                    >
                      {lastResult.won
                        ? `WIN · ${choiceLabel(lastResult.pick)} · +PKR ${formatPkr(lastResult.win)}`
                        : `LOSE · Sum ${lastResult.sum}`}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 shrink-0">
                <button type="button" className={zoneButtonClass(choice === 'up', 'up')} onClick={() => onChoice('up')}>
                  <div className="size-11 bg-gradient-to-br from-[#fbc02d] to-[#f57f17] shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_4px_8px_rgba(0,0,0,0.3)] rounded-full flex justify-center items-center">
                    <ChevronUp className="size-6 text-[#0a0603]" />
                  </div>
                  <span className="font-bold text-sm">7 UP</span>
                  <span className="text-[#a1a1a1] text-xs">Sum 8–12 · 2×</span>
                </button>
                <button type="button" className={zoneButtonClass(choice === 'seven', 'seven')} onClick={() => onChoice('seven')}>
                  <div className="size-11 bg-gradient-to-br from-[#ffeb3b] to-[#fbc02d] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_4px_8px_rgba(0,0,0,0.3)] rounded-full flex justify-center items-center">
                    <Sparkles className="size-5 text-[#0a0603]" />
                  </div>
                  <span className="font-bold text-sm">LUCKY 7</span>
                  <span className="text-[#a1a1a1] text-xs">Exact 7 · 5×</span>
                </button>
                <button type="button" className={zoneButtonClass(choice === 'down', 'down')} onClick={() => onChoice('down')}>
                  <div className="size-11 bg-gradient-to-br from-[#f57f17] to-[#c41e3a] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_8px_rgba(0,0,0,0.3)] rounded-full flex justify-center items-center">
                    <ChevronDown className="size-6 text-white" />
                  </div>
                  <span className="font-bold text-sm">7 DOWN</span>
                  <span className="text-[#a1a1a1] text-xs">Sum 2–6 · 2×</span>
                </button>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <span className="text-[#a1a1a1] text-xs mr-1">Stake</span>
                {STAKES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={rolling}
                    onClick={() => onBetAmount(s)}
                    className={`font-medium rounded-lg text-sm px-4 py-2 border-0 cursor-pointer disabled:opacity-40 ${
                      betAmount === s ? 'font-bold bg-neutral-200 text-neutral-900' : 'bg-neutral-800 text-neutral-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={rolling || !choice}
                  onClick={onRoll}
                  className="bg-gradient-to-r from-[#ffeb3b] via-[#fbc02d] to-[#f57f17] shadow-[0_0_28px_rgba(251,192,45,0.5)] font-extrabold rounded-xl text-[#0a0603] text-base flex py-3.5 justify-center items-center flex-1 gap-2 border-0 cursor-pointer disabled:opacity-50"
                >
                  <Dices className="size-5" />
                  ROLL · BET PKR {formatPkr(betAmount)}
                </button>
              </div>
            </main>

            <aside className="game-sidebar game-sidebar-wide shrink-0 flex flex-col">
              <div className="game-panel bg-neutral-900/80 border border-white/10 rounded-xl">
                <div className="flex items-center gap-2 font-bold text-sm mb-3">
                  <History className="size-4 text-[#f57f17]" /> Round History
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {history.map((h, i) => (
                    <span key={`${h}-${i}`} className={`aspect-square font-bold rounded-full text-xs flex justify-center items-center ${sumHistoryClass(h)}`}>
                      {h}
                    </span>
                  ))}
                </div>
              </div>
              <div className="game-panel bg-neutral-900/80 border border-white/10 rounded-xl flex-1 flex flex-col gap-3 min-h-0">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Radio className="size-4 text-[#f57f17]" /> Live Bets Feed
                </div>
                {liveFeed.map((row) => (
                  <div key={row.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-8 font-bold rounded-full bg-neutral-800 text-[11px] flex justify-center items-center">{row.initials}</span>
                      <div>
                        <div className="font-medium text-xs">{row.name}</div>
                        <div className="text-[#a1a1a1] text-[11px]">PKR {formatPkr(row.bet)} · {row.pick}</div>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        row.status === 'won' ? 'text-[#fbc02d]' : row.status === 'lost' ? 'text-[#ff6467]' : 'text-[#a1a1a1] font-medium'
                      }`}
                    >
                      {row.status === 'won' ? 'WON' : row.status === 'lost' ? 'lost' : 'rolling'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="game-panel bg-neutral-900/80 border border-white/10 rounded-xl flex flex-col gap-2">
                <div className="text-sm flex justify-between">
                  <span className="text-[#a1a1a1]">Total Stake</span>
                  <span className="font-bold">PKR {formatPkr(choice ? betAmount : 0)}</span>
                </div>
                <div className="text-sm flex justify-between">
                  <span className="text-[#a1a1a1]">Potential Win</span>
                  <span className="font-bold text-[#fbc02d]">PKR {formatPkr(choice ? potentialWin : 0)}</span>
                </div>
              </div>
            </aside>
          </div>

          <footer className="game-footer border-white/10 border-t border-solid flex px-8 py-3 justify-between items-center shrink-0 bg-[#0a0603]/60">
            <div className="flex items-center gap-4 overflow-hidden">
              <span className="shrink-0 font-bold text-[#fbc02d] text-xs flex items-center gap-2">
                <Trophy className="size-4" /> LIVE WINS
              </span>
              <div className="text-xs flex items-center gap-4 overflow-hidden whitespace-nowrap text-[#a1a1a1]">
                {liveWins.map((w, i) => (
                  <span key={w.name}>
                    {i > 0 && ' · '}
                    <span className="font-bold text-neutral-50">{w.name}</span> won{' '}
                    <span className="font-bold text-[#fbc02d]">PKR {formatPkr(w.amount)}</span> on {w.pick}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 w-80 shrink-0">
              <div className="rounded-full bg-neutral-800 flex px-4 py-2 items-center flex-1 gap-2">
                <MessageCircle className="size-4 text-[#a1a1a1]" />
                <input className="bg-transparent outline-none text-xs flex-1" placeholder="Type a message..." readOnly />
              </div>
              <button type="button" className="size-9 rounded-full bg-neutral-200 text-neutral-900 border-0 flex justify-center items-center">
                <Send className="size-4" />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
