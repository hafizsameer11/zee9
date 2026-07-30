import type { RefObject } from 'react'
import {
  BookOpen,
  Diamond,
  Flame,
  Gem,
  History,
  MessageCircle,
  Minus,
  Plus,
  RefreshCw,
  RotateCw,
  Send,
  Settings,
  Sparkles,
  Table,
  Trophy,
  Wallet,
} from 'lucide-react'
import type { OxSymbol } from '../engines/fortuneOx'
import { OX_SYMBOL_META } from '../engines/fortuneOx'
import { getDesignCanvasStyle, getDesignScaleShellStyle, type DesignLayout } from '../hooks/useDesignScale'
import { OxMascot, OxSymbolCell } from './fortuneOxGfx'
import './zee9Premium.tw.css'

const STAKES = [10, 20, 50, 100, 500, 1000, 2000, 5000, 10000]

function formatPkr(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

type RecentWin = { initials: string; name: string; pick: string; amount: number }

export type FortuneOxDesignUIProps = {
  viewportRef: RefObject<HTMLDivElement | null>
  layout: DesignLayout
  rootClassName: string
  canvasClassName: string
  balance: number
  betAmount: number
  grid: OxSymbol[][]
  spinning: boolean
  lastWin: number
  bigWin: string | null
  winCells: Set<string>
  jackpot: number
  bigWinHistory: number[]
  recentWins: RecentWin[]
  liveTicker: { name: string; amount: number; pick: string }[]
  onBetMinus: () => void
  onBetPlus: () => void
  onQuickStake: (n: number) => void
  onSpin: () => void
  onHome: () => void
}

export default function FortuneOxDesignUI({
  viewportRef,
  layout,
  rootClassName,
  canvasClassName,
  balance,
  betAmount,
  grid,
  spinning,
  lastWin,
  bigWin,
  winCells,
  jackpot,
  bigWinHistory,
  recentWins,
  liveTicker,
  onBetMinus,
  onBetPlus,
  onQuickStake,
  onSpin,
  onHome,
}: FortuneOxDesignUIProps) {
  return (
    <div className={rootClassName} ref={viewportRef}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div
          className={canvasClassName}
          style={getDesignCanvasStyle(layout)}
        >
        <div className="game-ui bg-[radial-gradient(ellipse_at_top,oklch(0.22_0.05_25),oklch(0.145_0_0))] flex flex-col w-full h-full overflow-hidden text-neutral-50">
          <header className="bg-[#0a0603]/70 backdrop-blur-sm shrink-0 border-white/10 border-b border-solid flex px-8 justify-between items-center h-16">
            <button type="button" className="flex items-center gap-2 border-0 bg-transparent cursor-pointer p-0" onClick={onHome}>
              <div className="size-8 rotate-45 bg-gradient-to-br from-[#f4d98a] to-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.5)] rounded-sm flex justify-center items-center">
                <Diamond className="size-4 -rotate-45 text-[#0a0603]" />
              </div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-[#f4d98a] to-[#d4af37] bg-clip-text text-transparent">
                Zee9
              </span>
            </button>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-[#f4d98a] to-[#d4af37] shadow-[0_0_16px_rgba(212,175,55,0.35)] rounded-full flex px-4 py-2 items-center gap-2">
                <Wallet className="size-4 text-[#1a0f02]" />
                <span className="font-bold text-[#1a0f02] text-sm">PKR {formatPkr(balance)}</span>
              </div>
              <button type="button" className="size-9 rounded-full text-[#a1a1a1] border border-white/10 bg-neutral-800 flex justify-center items-center">
                <History className="size-4" />
              </button>
              <button type="button" className="size-9 rounded-full text-[#a1a1a1] border border-white/10 bg-neutral-800 flex justify-center items-center">
                <Settings className="size-4" />
              </button>
            </div>
          </header>

          <div className="game-body min-h-0 flex flex-1">
            <aside className="game-sidebar shrink-0 flex flex-col">
              <div className="game-panel bg-neutral-900/80 border border-white/10 rounded-xl flex flex-col gap-3">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <BookOpen className="size-4 text-[#a1a1a1]" /> How to Play
                </div>
                {['Set your bet and hit SPIN.', 'Match 3+ symbols on a payline.', 'Ox Wild triggers gold multipliers.'].map(
                  (t, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="size-5 shrink-0 font-bold rounded-full bg-neutral-800 text-[10px] flex justify-center items-center">
                        {i + 1}
                      </span>
                      <span className="text-[#a1a1a1] text-xs">{t}</span>
                    </div>
                  ),
                )}
              </div>
              <div className="game-panel bg-neutral-900/80 border border-white/10 rounded-xl flex flex-col gap-2">
                <div className="flex items-center gap-2 font-semibold text-sm mb-2">
                  <Table className="size-4 text-[#a1a1a1]" /> Paytable
                </div>
                {(['ox', 'coin', 'envelope', 'ingot'] as const).map((sym) => (
                  <div key={sym} className="rounded-lg bg-neutral-800 flex px-3 py-2 justify-between items-center">
                    <span className="text-xs flex items-center gap-1.5">
                      <span className="text-base">{OX_SYMBOL_META[sym].emoji}</span>
                      {OX_SYMBOL_META[sym].label}
                    </span>
                    <span className="font-bold text-xs">{OX_SYMBOL_META[sym].payout3}×</span>
                  </div>
                ))}
              </div>
              <div className="game-panel bg-neutral-900/80 border border-white/10 rounded-xl flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <RefreshCw className="size-4 text-[#a1a1a1]" /> Auto Spin Tips
                </div>
                <div className="text-xs flex justify-between">
                  <span className="text-[#a1a1a1]">Session RTP</span>
                  <span className="font-semibold text-[#1bd6a0]">96.8%</span>
                </div>
                <div className="rounded-full bg-neutral-800 h-1.5 overflow-hidden">
                  <div className="w-[68%] rounded-full bg-[#1bd6a0] h-full" />
                </div>
                <span className="text-[#a1a1a1] text-[10px]">High volatility — big swings, big wins</span>
              </div>
            </aside>

            <main className="game-main min-w-0 flex flex-col flex-1 min-h-0">
              <div className="flex justify-between items-end shrink-0">
                <div>
                  <h1 className="bg-gradient-to-br from-[#f4d98a] via-[#d4af37] to-[#c41e3a] bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(212,175,55,0.45)] font-black text-6xl tracking-tight">
                    FORTUNE OX
                  </h1>
                  <span className="text-[#a1a1a1] text-sm">Match the golden ox — riches of the new year await</span>
                </div>
                <div className="rounded-full bg-[#c41e3a]/20 border border-[#c41e3a]/40 flex px-3 py-1.5 items-center gap-2">
                  <span className={`size-2 rounded-full ${spinning ? 'bg-[#c41e3a] animate-pulse' : 'bg-[#1bd6a0]'}`} />
                  <span className="font-semibold text-xs">{spinning ? 'SPINNING…' : 'READY TO SPIN'}</span>
                </div>
              </div>

              <div className="game-main-inner relative bg-[radial-gradient(ellipse_at_center,oklch(0.26_0.06_25),oklch(0.16_0.03_25))] shadow-[inset_0_0_40px_rgba(0,0,0,0.4)] border border-white/10 rounded-2xl p-6 flex-1 min-h-0 flex flex-col gap-4">
                <OxMascot />
                <div className="flex flex-col justify-center flex-1 gap-6 min-h-0">
                  <div className="bg-[oklch(0.18_0.02_25)] shadow-[inset_0_8px_30px_rgba(0,0,0,0.5)] rounded-2xl border border-white/10 p-4">
                    <div className="grid grid-cols-5 gap-3">
                      {grid.map((row, ri) =>
                        row.map((sym, ci) => (
                          <OxSymbolCell
                            key={`${ri}-${ci}`}
                            symbol={sym}
                            spinning={spinning}
                            win={winCells.has(`${ri}-${ci}`)}
                          />
                        )),
                      )}
                    </div>
                  </div>
                  {bigWin && (
                    <div className="flex justify-center">
                      <div className="shadow-[0_0_20px_rgba(27,214,160,0.2)] rounded-full bg-[#1bd6a0]/12 border border-[#1bd6a0]/40 flex px-4 py-2 items-center gap-2">
                        <Sparkles className="size-4 text-[#1bd6a0]" />
                        <span className="font-bold text-[#1bd6a0] text-sm">{bigWin}</span>
                        <Sparkles className="size-4 text-[#1bd6a0]" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center gap-6 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-[oklch(0.22_0.02_25)] rounded-full border border-white/10 flex px-2 py-1 items-center gap-2">
                      <button type="button" className="size-7 rounded-full text-[#a1a1a1] border-0 bg-transparent cursor-pointer disabled:opacity-40" onClick={onBetMinus} disabled={spinning}>
                        <Minus className="size-4" />
                      </button>
                      <span className="font-semibold text-sm w-16 text-center">PKR {formatPkr(betAmount)}</span>
                      <button type="button" className="size-7 rounded-full text-[#a1a1a1] border-0 bg-transparent cursor-pointer disabled:opacity-40" onClick={onBetPlus} disabled={spinning}>
                        <Plus className="size-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {STAKES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`font-medium rounded-lg text-xs border border-white/10 px-3 py-1.5 cursor-pointer disabled:opacity-40 ${
                            betAmount === s ? 'bg-neutral-800 text-neutral-50' : 'text-[#a1a1a1] bg-transparent'
                          }`}
                          onClick={() => onQuickStake(s)}
                          disabled={spinning}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="uppercase text-[#a1a1a1] text-[10px] tracking-wide">Last Win</span>
                      <span className="font-bold text-[#1bd6a0] text-xs">PKR {formatPkr(lastWin)}</span>
                    </div>
                    <button
                      type="button"
                      className="bg-gradient-to-br from-[#f4d98a] to-[#d4af37] shadow-[0_0_28px_rgba(212,175,55,0.5)] font-black rounded-xl text-[#1a0f02] text-lg px-10 h-14 border-0 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      onClick={onSpin}
                      disabled={spinning}
                    >
                      <RotateCw className={`size-6 ${spinning ? 'animate-spin' : ''}`} />
                      SPIN
                    </button>
                  </div>
                </div>
              </div>
            </main>

            <aside className="game-sidebar game-sidebar-wide shrink-0 flex flex-col">
              <div className="game-panel bg-neutral-900/80 border border-white/10 rounded-xl flex flex-col gap-2">
                <div className="flex items-center gap-2 font-semibold text-sm mb-2">
                  <Trophy className="size-4 text-[#a1a1a1]" /> Recent Wins
                </div>
                {recentWins.map((w) => (
                  <div key={w.name} className="rounded-lg bg-neutral-800 flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-7 font-bold rounded-full bg-[#c41e3a] text-white text-[10px] flex justify-center items-center">
                        {w.initials}
                      </span>
                      <div>
                        <div className="font-bold text-sm">{w.name}</div>
                        <div className="text-[#a1a1a1] text-[10px]">{w.pick}</div>
                      </div>
                    </div>
                    <span className="font-bold text-[#1bd6a0] text-xs">PKR {formatPkr(w.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="game-panel bg-neutral-900/80 border border-white/10 rounded-xl flex flex-col gap-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Gem className="size-4 text-[#a1a1a1]" /> Grand Jackpot
                </div>
                <span className="font-black text-2xl">PKR {formatPkr(jackpot)}</span>
                <div className="rounded-full bg-neutral-800 h-2 overflow-hidden">
                  <div className="w-[74%] bg-gradient-to-r from-[#c41e3a] to-[#f4d98a] rounded-full h-full" />
                </div>
                <span className="text-[#a1a1a1] text-[10px]">74% to next drop</span>
              </div>
              <div className="game-panel bg-neutral-900/80 border border-white/10 rounded-xl flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Flame className="size-4 text-[#a1a1a1]" /> Big Win History
                </div>
                <div className="flex flex-wrap gap-2">
                  {bigWinHistory.map((m, i) => (
                    <span
                      key={`${m}-${i}`}
                      className={`font-bold rounded-lg text-xs border border-white/10 px-2.5 py-1 ${
                        m >= 50 ? 'text-[#1bd6a0]' : m >= 20 ? 'text-neutral-50' : 'text-[#a1a1a1]'
                      } bg-neutral-800`}
                    >
                      {m}×
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </div>

          <footer className="game-footer bg-[#0a0603]/70 backdrop-blur-sm shrink-0 border-white/10 border-t border-solid flex px-8 justify-between items-center h-14">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="flex items-center gap-1.5 shrink-0">
                <Trophy className="size-4 text-[#1bd6a0]" />
                <span className="font-bold text-[#1bd6a0] text-xs">LIVE WINS</span>
              </div>
              <div className="text-[#a1a1a1] text-xs flex gap-4 overflow-hidden whitespace-nowrap">
                {liveTicker.map((w, i) => (
                  <span key={w.name}>
                    {i > 0 && <span className="opacity-40 mr-4">·</span>}
                    <span className="font-semibold text-neutral-50">{w.name}</span> won{' '}
                    <span className="font-semibold text-neutral-50">PKR {formatPkr(w.amount)}</span> on {w.pick}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-[oklch(0.22_0.02_25)] rounded-full border border-white/10 flex px-4 py-2 items-center gap-2 w-72">
              <MessageCircle className="size-4 text-[#a1a1a1]" />
              <input className="bg-transparent outline-none text-xs flex-1" placeholder="Type a message..." readOnly />
              <Send className="size-4 text-[#a1a1a1]" />
            </div>
          </footer>
        </div>
        </div>
      </div>
    </div>
  )
}
