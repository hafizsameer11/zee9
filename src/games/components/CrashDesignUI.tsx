import type { RefObject } from 'react'
import {
  BookOpen,
  Diamond,
  HandCoins,
  History,
  Lock,
  MessageCircle,
  Minus,
  Plus,
  Radio,
  RefreshCw,
  Rocket,
  Send,
  Settings,
  ShieldCheck,
  SquareCheck,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from 'lucide-react'
import { getDesignCanvasStyle, type DesignLayout } from '../hooks/useDesignScale'
import { buildCrashCurvePaths, multiplierToCrashProgress, CRASH_VIEW_H, CRASH_VIEW_W } from '../engines/crashCurve'
import { CrashRocket, crashHistoryChipClass } from './crashGfx'
import './crash.tw.css'

const LIVE_WINS = [
  { name: 'Ahmed_K', amount: 12500, mult: 5.87 },
  { name: 'Sana92', amount: 900, mult: 2.41 },
  { name: 'Bilal.R', amount: 4000, mult: 8.15 },
]

const STAKES = [50, 100, 500, 1000]

type Phase = 'idle' | 'flying' | 'crashed' | 'cashed'

type LiveFeedItem = {
  initials: string
  name: string
  bet: number
  mult: number | null
  status: 'won' | 'flying'
}

function formatPkr(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export type CrashDesignUIProps = {
  viewportRef: RefObject<HTMLDivElement | null>
  layout: DesignLayout
  designW: number
  designH: number
  rootClassName: string
  canvasClassName: string
  balance: number
  betAmount: number
  autoCashout: number
  onAutoCashout: (n: number) => void
  onBetMinus: () => void
  onBetPlus: () => void
  onQuickStake: (n: number) => void
  mult: number
  phase: Phase
  flying: boolean
  crashed: boolean
  history: number[]
  roundNo: number
  liveFeed: LiveFeedItem[]
  totalStake: number
  potentialWin: number
  lastWin: number | null
  onBet: () => void
  onCashOut: () => void
  onHome: () => void
}

export default function CrashDesignUI({
  viewportRef,
  layout,
  designW,
  designH,
  rootClassName,
  canvasClassName,
  balance,
  betAmount,
  autoCashout,
  onAutoCashout,
  onBetMinus,
  onBetPlus,
  onQuickStake,
  mult,
  phase,
  flying,
  crashed,
  history,
  roundNo,
  liveFeed,
  totalStake,
  potentialWin,
  lastWin,
  onBet,
  onCashOut,
  onHome,
}: CrashDesignUIProps) {
  const progress = flying || crashed ? multiplierToCrashProgress(mult) : 0
  const showProgress = flying || crashed ? Math.max(progress, flying ? 0.03 : 0) : 0
  const curve = buildCrashCurvePaths(showProgress)
  const showCurve = (flying || crashed) && showProgress > 0
  const cashOutAmt = Math.round(betAmount * mult)
  const statusText =
    phase === 'idle'
      ? 'Ready to launch'
      : phase === 'flying'
        ? 'Flying · Cash out now'
        : phase === 'cashed'
          ? 'Cashed out!'
          : 'Crashed!'

  return (
    <div className={rootClassName} ref={viewportRef}>
      <div
        className={canvasClassName}
        style={getDesignCanvasStyle(layout, designW, designH)}
      >
        <div className="game-ui bg-[radial-gradient(ellipse_at_top,oklch(0.22_0.04_40),oklch(0.145_0.01_40))] flex flex-col w-full h-full overflow-hidden text-neutral-50">
          <header className="shrink-0 bg-[#0a0603]/80 backdrop-blur-md border-white/10 border-b border-solid flex px-8 justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <button type="button" className="flex items-center gap-2 border-0 bg-transparent p-0 cursor-pointer" onClick={onHome}>
                <div className="size-9 bg-gradient-to-br from-[#f4d98a] to-[#d4af37] rotate-45 shadow-[0_0_16px_rgba(212,175,55,0.5)] rounded-lg flex justify-center items-center">
                  <Diamond className="size-4 -rotate-45 text-[#0a0603]" />
                </div>
                <span className="bg-gradient-to-r from-[#f4d98a] to-[#d4af37] bg-clip-text text-transparent font-extrabold text-xl leading-7 tracking-tight">
                  Zee9
                </span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="shadow-[0_0_14px_rgba(212,175,55,0.35)] rounded-full bg-[#0a0603]/70 border-[#d4af37]/50 border border-solid flex px-4 py-2 items-center gap-2">
                <Wallet className="size-4 text-[#f4d98a]" />
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
            <aside className="game-sidebar shrink-0 flex flex-col">
              <div className="game-panel bg-[#0a0603]/70 border-white/10 border border-solid rounded-xl flex flex-col gap-3">
                <div className="font-semibold text-sm flex items-center gap-2">
                  <BookOpen className="size-4 text-[#5ea0f2]" />
                  How to Play
                </div>
                {[
                  'Place your bet before the rocket lifts off.',
                  'Watch the multiplier climb as it flies.',
                  'Cash out before it crashes to win big.',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="size-5 shrink-0 font-bold rounded-full bg-[#1565c0]/20 text-[#5ea0f2] text-xs flex justify-center items-center">
                      {i + 1}
                    </span>
                    <p className="text-[#a1a1a1] text-xs leading-4">{text}</p>
                  </div>
                ))}
              </div>
              <div className="game-panel bg-[#0a0603]/70 border-white/10 border border-solid rounded-xl flex flex-col gap-2">
                <div className="font-semibold text-sm flex items-center gap-2">
                  <Zap className="size-4 text-[#f4d98a]" />
                  Auto Cashout Tips
                </div>
                {[
                  { label: 'Safe target', val: '1.5×', color: 'text-[#1bd6a0]' },
                  { label: 'Balanced target', val: '2.5×', color: 'text-[#5ea0f2]' },
                  { label: 'High risk target', val: '10×+', color: 'text-[#c41e3a]' },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center">
                    <span className="text-[#a1a1a1] text-xs">{row.label}</span>
                    <span className={`font-bold text-xs ${row.color}`}>{row.val}</span>
                  </div>
                ))}
              </div>
              <div className="game-panel bg-[#0a0603]/70 border-white/10 border border-solid rounded-xl flex-1 flex flex-col gap-3">
                <div className="font-semibold text-sm flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#1bd6a0]" />
                  Provably Fair
                </div>
                <div className="text-[#a1a1a1] text-xs flex items-center gap-2">
                  <Lock className="size-3.5" /> Bets lock at liftoff
                </div>
                <div className="text-[#a1a1a1] text-xs flex items-center gap-2">
                  <SquareCheck className="size-3.5" /> Verifiable crash seed
                </div>
                <div className="text-[#a1a1a1] text-xs flex items-center gap-2">
                  <RefreshCw className="size-3.5" /> New round every 15s
                </div>
                <div className="border-white/10 border-t border-solid flex pt-3 flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[#a1a1a1] text-xs">Your Win Rate</span>
                    <span className="font-bold text-[#1bd6a0] text-xs">61%</span>
                  </div>
                  <div className="rounded-full bg-neutral-800 h-1.5 overflow-hidden">
                    <div className="w-[61%] bg-gradient-to-r from-[#1565c0] to-[#1bd6a0] rounded-full h-full" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#a1a1a1] text-xs">Rounds Played</span>
                    <span className="font-bold text-xs">287</span>
                  </div>
                </div>
              </div>
            </aside>

            <main className="game-main min-w-0 flex flex-col flex-1 min-h-0">
              <div className="flex justify-between items-start shrink-0">
                <div className="flex flex-col gap-1">
                  <h1 className="bg-gradient-to-r from-[#5ea0f2] to-[#1565c0] bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(21,101,192,0.5)] font-extrabold text-5xl leading-tight tracking-tight">
                    CRASH
                  </h1>
                  <p className="text-[#a1a1a1] text-sm">One rocket, infinite altitude — cash out before it blows</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-[#c41e3a]/15 border-[#c41e3a]/40 border border-solid flex px-3 py-1.5 items-center gap-2">
                    <span className={`size-2 rounded-full ${flying ? 'bg-[#c41e3a] animate-pulse' : 'bg-[#a1a1a1]'}`} />
                    <span className={`font-semibold text-xs ${flying ? 'text-[#e5546c]' : 'text-[#a1a1a1]'}`}>
                      {flying ? 'LIVE ROUND' : 'WAITING'}
                    </span>
                  </div>
                  <div className="rounded-full bg-neutral-800 border-white/10 border border-solid px-3 py-1.5">
                    <span className="font-medium text-[#a1a1a1] text-xs"># Round {roundNo}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <span className="text-[#a1a1a1] text-xs mr-1">Recent</span>
                {history.slice(0, 8).map((h, i) => (
                  <span key={`${h}-${i}`} className={`font-bold rounded-md text-xs px-2.5 py-1 ${crashHistoryChipClass(h)}`}>
                    {h.toFixed(2)}×
                  </span>
                ))}
              </div>

              <div className="relative bg-[radial-gradient(ellipse_at_bottom_left,#1a3a5c,#0a0603)] border-[#1565c0]/30 border border-solid rounded-xl flex-1 min-h-0 overflow-hidden">
                <div className="bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:24px_24px] absolute inset-0" />
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${CRASH_VIEW_W} ${CRASH_VIEW_H}`}>
                  <defs>
                    <linearGradient id="crashCurveFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#5ea0f2" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#5ea0f2" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {showCurve && (
                    <>
                      <path d={curve.fill} fill="url(#crashCurveFill)" />
                      <path
                        d={curve.stroke}
                        fill="none"
                        stroke="#5ea0f2"
                        strokeLinecap="round"
                        strokeWidth="5"
                        className="drop-shadow-[0_0_10px_rgba(94,160,242,0.8)]"
                      />
                    </>
                  )}
                </svg>
                {showCurve && (
                  <div
                    className="absolute"
                    style={{
                      left: `${curve.tipPercent.left}%`,
                      top: `${curve.tipPercent.top}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <CrashRocket size={56} />
                  </div>
                )}
                {!flying && phase === 'idle' && (
                  <div className="absolute inset-0 flex flex-col justify-center items-center gap-3 opacity-60">
                    <CrashRocket size={72} />
                    <span className="text-[#a1a1a1] text-sm uppercase tracking-widest">Ready to launch</span>
                  </div>
                )}
                <div className="flex absolute inset-0 flex-col justify-center items-center gap-2 pointer-events-none">
                  <span
                    className={`drop-shadow-[0_0_24px_rgba(94,160,242,0.6)] font-extrabold text-7xl tracking-tight ${
                      crashed ? 'text-[#ff6467]' : phase === 'cashed' ? 'text-[#1bd6a0]' : 'text-[#5ea0f2]'
                    }`}
                  >
                    {mult.toFixed(2)}×
                  </span>
                  <span className="font-medium uppercase text-[#a1a1a1] text-sm tracking-widest">{statusText}</span>
                </div>
                {lastWin != null && phase === 'cashed' && (
                  <div className="rounded-full bg-[#1bd6a0]/15 border-[#1bd6a0]/40 border border-solid flex absolute left-4 bottom-4 px-3 py-1.5 items-center gap-2">
                    <TrendingUp className="size-3.5 text-[#1bd6a0]" />
                    <span className="font-semibold text-[#1bd6a0] text-xs">Cashed out · +PKR {formatPkr(lastWin)}</span>
                  </div>
                )}
              </div>

              <div className="bg-[#0a0603]/80 border-white/10 border border-solid rounded-xl p-4 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[#a1a1a1] text-xs">Bet</span>
                    <div className="rounded-lg bg-neutral-800 border-white/10 border border-solid flex items-center overflow-hidden">
                      <button type="button" className="size-9 text-[#a1a1a1] flex justify-center items-center border-0 bg-transparent cursor-pointer disabled:opacity-40" onClick={onBetMinus} disabled={flying}>
                        <Minus className="size-4" />
                      </button>
                      <span className="font-bold text-sm px-3 min-w-[90px] text-center">PKR {formatPkr(betAmount)}</span>
                      <button type="button" className="size-9 text-[#a1a1a1] flex justify-center items-center border-0 bg-transparent cursor-pointer disabled:opacity-40" onClick={onBetPlus} disabled={flying}>
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#a1a1a1] text-xs">Auto cashout</span>
                    <div className="rounded-lg bg-neutral-800 border-white/10 border border-solid flex px-2 items-center h-9">
                      <input
                        type="number"
                        min={1.1}
                        step={0.1}
                        value={autoCashout}
                        onChange={(e) => onAutoCashout(Number(e.target.value))}
                        disabled={flying}
                        className="bg-transparent outline-none font-bold text-sm w-14 text-center text-neutral-50"
                      />
                      <span className="text-[#a1a1a1] text-xs">×</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[#a1a1a1] text-xs mr-1">Quick</span>
                    {STAKES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="font-semibold rounded-lg bg-neutral-800 text-xs border-white/10 border border-solid px-3 h-9 cursor-pointer hover:border-[#1565c0]/40 disabled:opacity-40"
                        onClick={() => onQuickStake(s)}
                        disabled={flying}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1" />
                  {phase === 'idle' ? (
                    <button
                      type="button"
                      className="bg-gradient-to-br from-[#f4d98a] to-[#d4af37] shadow-[0_0_22px_rgba(212,175,55,0.5)] font-extrabold rounded-xl text-[#0a0603] text-sm flex px-8 items-center gap-2 h-11 border-0 cursor-pointer"
                      onClick={onBet}
                    >
                      <Rocket className="size-4" />
                      BET · PKR {formatPkr(betAmount)}
                    </button>
                  ) : phase === 'flying' ? (
                    <button
                      type="button"
                      className="shadow-[0_0_22px_rgba(196,30,58,0.5)] font-extrabold rounded-xl bg-[#c41e3a] text-white text-sm flex px-8 items-center gap-2 h-11 border-0 cursor-pointer"
                      onClick={onCashOut}
                    >
                      <HandCoins className="size-4" />
                      CASH OUT · {formatPkr(cashOutAmt)}
                    </button>
                  ) : (
                    <button type="button" className="font-extrabold rounded-xl bg-neutral-800 text-[#a1a1a1] text-sm px-8 h-11 border-0 cursor-default" disabled>
                      {phase === 'crashed' ? 'CRASHED' : 'WON!'}
                    </button>
                  )}
                </div>
              </div>
            </main>

            <aside className="game-sidebar game-sidebar-wide shrink-0 flex flex-col">
              <div className="game-panel bg-[#0a0603]/70 border-white/10 border border-solid rounded-xl flex flex-col gap-2">
                <div className="font-semibold text-sm flex items-center gap-2">
                  <History className="size-4 text-[#5ea0f2]" />
                  Round History
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {history.slice(0, 9).map((h, i) => (
                    <span key={`${h}-${i}`} className={`font-bold text-center rounded-md text-xs py-1.5 ${crashHistoryChipClass(h)}`}>
                      {h.toFixed(2)}×
                    </span>
                  ))}
                </div>
              </div>
              <div className="game-panel bg-[#0a0603]/70 border-white/10 border border-solid rounded-xl flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
                <div className="font-semibold text-sm flex items-center gap-2 shrink-0">
                  <Radio className="size-4 text-[#1bd6a0]" />
                  Live Bets Feed
                </div>
                <div className="flex flex-col gap-2.5 overflow-y-auto min-h-0">
                  {liveFeed.map((row) => (
                    <div key={row.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="size-8 font-bold rounded-full bg-[#1565c0]/25 text-[#5ea0f2] text-xs flex justify-center items-center">
                          {row.initials}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs">{row.name}</span>
                          <span className="text-[#a1a1a1] text-[10px]">PKR {formatPkr(row.bet)}</span>
                        </div>
                      </div>
                      {row.status === 'won' && row.mult != null ? (
                        <span className="font-bold text-[#1bd6a0] text-xs">{row.mult.toFixed(2)}×</span>
                      ) : (
                        <span className="font-medium text-[#5ea0f2] text-xs">flying</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="game-panel bg-[#0a0603]/70 border-white/10 border border-solid rounded-xl flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#a1a1a1] text-xs">Total in Play</span>
                  <span className="font-bold text-sm">PKR {formatPkr(totalStake)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#a1a1a1] text-xs">Potential Win</span>
                  <span className="font-bold text-[#f4d98a] text-sm">PKR {formatPkr(potentialWin)}</span>
                </div>
              </div>
            </aside>
          </div>

          <footer className="game-footer shrink-0 bg-[#0a0603]/80 border-white/10 border-t border-solid flex px-8 justify-between items-center h-14">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="shrink-0 flex items-center gap-2">
                <Trophy className="size-4 text-[#1bd6a0]" />
                <span className="font-bold text-[#1bd6a0] text-xs">LIVE WINS</span>
              </div>
              <div className="text-[#a1a1a1] text-xs flex items-center gap-4 overflow-hidden whitespace-nowrap">
                {LIVE_WINS.map((w, i) => (
                  <span key={w.name}>
                    {i > 0 && <span className="text-[#a1a1a1] mr-4">·</span>}
                    <span className="font-semibold text-neutral-50">{w.name}</span> won{' '}
                    <span className="font-bold text-[#1bd6a0]">PKR {formatPkr(w.amount)}</span> @ {w.mult.toFixed(2)}×
                  </span>
                ))}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2 w-80">
              <div className="rounded-full bg-neutral-800 border-white/10 border border-solid flex px-3 items-center flex-1 gap-2 h-9">
                <MessageCircle className="size-4 text-[#a1a1a1]" />
                <input className="bg-transparent outline-none text-xs flex-1 text-neutral-50" placeholder="Type a message..." readOnly />
              </div>
              <button type="button" className="size-9 rounded-full bg-[#1565c0] text-white border-0 flex justify-center items-center">
                <Send className="size-4" />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
