import type { RefObject } from 'react'
import { getDesignCanvasStyle, getDesignScaleShellStyle, type DesignLayout } from '../hooks/useDesignScale'
import {
  Diamond,
  History,
  MessageCircle,
  Minus,
  Plus,
  Radio,
  Rocket,
  Send,
  Settings,
  Trophy,
  Wallet,
} from 'lucide-react'
import { buildRocketCurve, multiplierToRocketProgress } from '../engines/doubleCrashCurve'
import { IllustratedRocket, historyChipClass } from './doubleCrashGfx'
import './doubleCrash.tw.css'

const LIVE_WINS = [
  { name: 'Ahmed_K', amount: 12500, mult: 5.87 },
  { name: 'Sana92', amount: 900, mult: 2.41 },
  { name: 'Bilal.R', amount: 4000, mult: 8.15 },
]

const STAKES = [50, 100, 500, 1000]

type SlotPhase = 'idle' | 'active' | 'cashed' | 'lost'

type RocketSlot = {
  bet: number
  autoAt: number
  phase: SlotPhase
  wager: number
}

type LiveFeedItem = {
  initials: string
  name: string
  bet: number
  rocket: 'A' | 'B' | 'both'
  mult: number | null
  status: 'won' | 'flying'
}

function formatPkr(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function rocketLabel(r: 'A' | 'B' | 'both') {
  if (r === 'both') return 'Both'
  return `Rocket ${r}`
}

function RocketPanel({
  variant,
  label,
  accentText,
  accentBorder,
  accentGlow,
  curveStroke,
  slot,
  displayMult,
  flying,
  crashed,
  onMinus,
  onPlus,
  onCashOut,
}: {
  variant: 'a' | 'b'
  label: string
  accentText: string
  accentBorder: string
  accentGlow: string
  curveStroke: string
  slot: RocketSlot
  displayMult: number
  flying: boolean
  crashed: boolean
  onMinus: () => void
  onPlus: () => void
  onCashOut: () => void
}) {
  const progress = flying || crashed ? multiplierToRocketProgress(displayMult) : 0
  const curve = buildRocketCurve(variant, Math.max(progress, flying ? 0.04 : 0))
  const tipLeft = `${(curve.tip.x / 400) * 100}%`
  const tipTop = `${(curve.tip.y / 300) * 100}%`
  const showCurve = flying || crashed
  const canCash = flying && slot.phase === 'active' && !crashed
  const winAmt = Math.round(slot.wager * displayMult)

  return (
    <div
      className={`bg-[#0a0603]/80 border ${accentBorder} relative flex flex-col overflow-hidden rounded-xl min-h-0 flex-1`}
    >
      <div
        className={`absolute inset-0 bg-[linear-gradient(${accentGlow}_0.06)_1px,transparent_1px),linear-gradient(90deg,${accentGlow}_0.06)_1px,transparent_1px)] bg-[length:24px_24px]`}
      />
      <div
        className={`${accentText} border ${accentBorder} rounded-full border-solid flex absolute left-2 top-2 px-2 py-0.5 items-center gap-1 bg-black/30 z-10`}
      >
        <Rocket className="size-3" />
        <span className="font-bold text-[9px]">{label}</span>
      </div>

      <div className="flex absolute inset-0 justify-center items-center">
        <div
          className="absolute inset-x-6 bottom-6 opacity-40"
          style={{
            height: variant === 'a' ? '62%' : '78%',
            background: `linear-gradient(to top right, ${accentGlow}33, transparent 60%)`,
          }}
        />
        <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {showCurve && (
            <path d={curve.stroke} fill="none" stroke={curveStroke} strokeWidth="4" strokeLinecap="round" />
          )}
        </svg>
        {showCurve && (
          <div className="absolute" style={{ left: tipLeft, top: tipTop, transform: 'translate(-50%, -50%)' }}>
            <IllustratedRocket variant={variant} size={variant === 'a' ? 36 : 40} />
          </div>
        )}
        {!flying && slot.phase === 'idle' && (
          <div className="flex flex-col items-center gap-1 opacity-50">
            <IllustratedRocket variant={variant} size={36} />
            <span className="text-[#a1a1a1] text-[9px] uppercase tracking-widest">Ready to launch</span>
          </div>
        )}
        <span
          className={`top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-3xl leading-none absolute ${accentText} ${
            crashed && slot.phase === 'lost' ? 'text-[#ff6467]' : ''
          } ${slot.phase === 'cashed' ? 'text-[#1bd6a0]' : ''}`}
        >
          {displayMult.toFixed(2)}×
        </span>
      </div>

      <div
        className={`bg-[#0a0603]/90 backdrop-blur-sm border-t ${accentBorder} border-solid flex absolute inset-x-0 bottom-0 p-1.5 items-center gap-1.5`}
      >
        <div className="flex items-center flex-1 gap-1.5 min-w-0">
          <div className="bg-neutral-900 rounded-md border-white/10 border border-solid flex items-center overflow-hidden">
            <button
              type="button"
              className="text-[#a1a1a1] size-7 flex justify-center items-center border-0 bg-transparent cursor-pointer disabled:opacity-40"
              onClick={onMinus}
              disabled={flying}
            >
              <Minus className="size-3" />
            </button>
            <span className="font-bold text-[10px] px-1 min-w-[52px] text-center">
              {formatPkr(slot.bet)}
            </span>
            <button
              type="button"
              className="text-[#a1a1a1] size-7 flex justify-center items-center border-0 bg-transparent cursor-pointer disabled:opacity-40"
              onClick={onPlus}
              disabled={flying}
            >
              <Plus className="size-3" />
            </button>
          </div>
          <span className="text-[#a1a1a1] text-[9px] shrink-0">auto {slot.autoAt.toFixed(1)}×</span>
        </div>
        {canCash ? (
          <button
            type="button"
            className={`font-bold rounded-md text-[10px] px-2.5 h-7 border-0 cursor-pointer shrink-0 ${
              variant === 'a'
                ? 'bg-gradient-to-br from-[#1bd6a0] to-[#0d8f6a] text-[#0a0603] shadow-[0_0_14px_rgba(27,214,160,0.5)]'
                : 'bg-gradient-to-br from-[#c41e3a] to-[#8b1530] text-white shadow-[0_0_14px_rgba(196,30,58,0.5)]'
            }`}
            onClick={onCashOut}
          >
            CASH OUT · {formatPkr(winAmt)}
          </button>
        ) : slot.phase === 'cashed' ? (
          <span className="font-bold text-[#1bd6a0] text-[10px]">WON!</span>
        ) : slot.phase === 'lost' ? (
          <span className="font-bold text-[#ff6467] text-[10px]">CRASHED</span>
        ) : null}
      </div>
    </div>
  )
}

export type DoubleCrashDesignUIProps = {
  viewportRef: RefObject<HTMLDivElement | null>
  layout: DesignLayout
  rootClassName: string
  canvasClassName: string
  balance: number
  slots: RocketSlot[]
  displayMultA: number
  displayMultB: number
  flying: boolean
  rocketCrashed: [boolean, boolean]
  history: number[]
  roundNo: number
  liveFeed: LiveFeedItem[]
  totalStake: number
  potentialWin: number
  placeBothTotal: number
  onPlaceBoth: () => void
  onCashOut: (index: number) => void
  onUpdateSlot: (index: number, patch: Partial<RocketSlot>) => void
  onQuickStake: (n: number) => void
  onHome: () => void
}

export default function DoubleCrashDesignUI({
  viewportRef,
  layout,
  rootClassName,
  canvasClassName,
  balance,
  slots,
  flying,
  rocketCrashed,
  history,
  roundNo,
  liveFeed,
  totalStake,
  potentialWin,
  placeBothTotal,
  onPlaceBoth,
  onCashOut,
  onUpdateSlot,
  onQuickStake,
  onHome,
  displayMultA,
  displayMultB,
}: DoubleCrashDesignUIProps) {
  const adjustBet = (index: number, delta: number) => {
    const next = Math.max(50, Math.min(5000, slots[index].bet + delta))
    onUpdateSlot(index, { bet: next })
  }

  return (
    <div className={rootClassName} ref={viewportRef}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div
          className={canvasClassName}
          style={getDesignCanvasStyle(layout)}
        >
        <div className="game-ui bg-[radial-gradient(ellipse_at_top,oklch(0.22_0.04_40),oklch(0.145_0.01_40))] flex flex-col w-full h-full overflow-hidden text-neutral-50">
          <header className="backdrop-blur-md shrink-0 bg-[#0a0603]/80 border-white/10 border-b border-solid flex px-3 justify-between items-center h-10">
            <div className="flex items-center gap-3">
              <button type="button" className="flex items-center gap-1.5 border-0 bg-transparent p-0 cursor-pointer" onClick={onHome}>
                <div className="size-6 bg-gradient-to-br from-[#f4d98a] to-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.5)] rounded flex justify-center items-center">
                  <Diamond className="size-3 text-[#0a0603]" />
                </div>
                <span className="bg-gradient-to-r from-[#f4d98a] to-[#d4af37] bg-clip-text text-transparent font-black text-sm tracking-tight">
                  Zee9
                </span>
              </button>
              <h1 className="bg-gradient-to-r from-[#f4d98a] via-[#d4af37] to-[#c41e3a] bg-clip-text text-transparent font-black text-sm tracking-wide">
                DOUBLE CRASH
              </h1>
              <div className="bg-[#c41e3a]/15 border-[#c41e3a]/40 rounded-full border border-solid flex px-2 py-0.5 items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${flying ? 'bg-[#ff6467] animate-pulse' : 'bg-[#a1a1a1]'}`} />
                <span className={`font-bold text-[9px] ${flying ? 'text-[#ff6467]' : 'text-[#a1a1a1]'}`}>
                  {flying ? 'LIVE' : 'WAITING'}
                </span>
              </div>
              <span className="text-[#a1a1a1] text-[9px]">Round {roundNo}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="shadow-[0_0_10px_rgba(212,175,55,0.25)] rounded-full bg-[#0a0603]/70 border-[#d4af37]/50 border border-solid flex px-2.5 py-1 items-center gap-1.5">
                <Wallet className="size-3 text-[#d4af37]" />
                <span className="font-bold text-[#f4d98a] text-[11px]">PKR {formatPkr(balance)}</span>
              </div>
              <button type="button" className="size-7 rounded-full bg-neutral-800 text-[#a1a1a1] border-white/10 border border-solid flex justify-center items-center">
                <History className="size-3.5" />
              </button>
              <button type="button" className="size-7 rounded-full bg-neutral-800 text-[#a1a1a1] border-white/10 border border-solid flex justify-center items-center">
                <Settings className="size-3.5" />
              </button>
            </div>
          </header>

          <div className="game-body min-h-0 flex flex-1">
            <main className="game-main min-w-0 flex flex-col flex-1 min-h-0">
              <div className="grid grid-cols-2 min-h-0 flex-1 gap-2">
                <RocketPanel
                  variant="a"
                  label="ROCKET A"
                  accentText="text-[#1bd6a0]"
                  accentBorder="border-[#1bd6a0]/35"
                  accentGlow="#1bd6a0"
                  curveStroke="#1bd6a0"
                  slot={slots[0]}
                  displayMult={displayMultA}
                  flying={flying}
                  crashed={rocketCrashed[0]}
                  onMinus={() => adjustBet(0, -50)}
                  onPlus={() => adjustBet(0, 50)}
                  onCashOut={() => onCashOut(0)}
                />
                <RocketPanel
                  variant="b"
                  label="ROCKET B"
                  accentText="text-[#ff6467]"
                  accentBorder="border-[#c41e3a]/35"
                  accentGlow="#c41e3a"
                  curveStroke="#c41e3a"
                  slot={slots[1]}
                  displayMult={displayMultB}
                  flying={flying}
                  crashed={rocketCrashed[1]}
                  onMinus={() => adjustBet(1, -50)}
                  onPlus={() => adjustBet(1, 50)}
                  onCashOut={() => onCashOut(1)}
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="shrink-0 text-[#a1a1a1] text-[9px] uppercase">Quick</span>
                <div className="flex items-center gap-1">
                  {STAKES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="bg-neutral-900 rounded-md text-[#a1a1a1] text-[10px] font-semibold border-white/10 border border-solid min-w-10 px-1.5 h-8 cursor-pointer hover:border-[#d4af37]/40 disabled:opacity-40"
                      onClick={() => onQuickStake(s)}
                      disabled={flying}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="bg-gradient-to-br from-[#f4d98a] to-[#d4af37] text-[#0a0603] shadow-[0_0_16px_rgba(212,175,55,0.5)] font-black rounded-lg text-xs flex ml-auto px-4 items-center gap-1.5 h-9 border-0 cursor-pointer disabled:opacity-50"
                  onClick={onPlaceBoth}
                  disabled={flying || placeBothTotal <= 0}
                >
                  <Rocket className="size-3.5" />
                  PLACE BOTH · {formatPkr(placeBothTotal)}
                </button>
              </div>
            </main>

            <aside className="game-sidebar game-sidebar-wide shrink-0 flex flex-col">
              <div className="game-panel backdrop-blur-md bg-[#0a0603]/60 border-white/10 border border-solid rounded-xl flex flex-col gap-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <History className="size-4 text-[#d4af37]" />
                  Round History
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {history.slice(0, 9).map((h, i) => (
                    <span
                      key={`${h}-${i}`}
                      className={`font-bold text-center rounded-lg text-xs leading-4 py-1.5 ${historyChipClass(h)}`}
                    >
                      {h.toFixed(2)}×
                    </span>
                  ))}
                </div>
              </div>
              <div className="game-panel backdrop-blur-md bg-[#0a0603]/60 border-white/10 border border-solid rounded-xl flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
                <div className="flex items-center gap-2 font-semibold text-sm shrink-0">
                  <Radio className="size-4 text-[#1bd6a0]" />
                  Live Bets Feed
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto min-h-0">
                  {liveFeed.map((row) => (
                    <div key={row.name} className="bg-neutral-900/60 rounded-lg flex p-2 justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-6 font-bold rounded-full text-[10px] flex justify-center items-center ${
                            row.rocket === 'B'
                              ? 'bg-[#c41e3a]/20 text-[#ff6467]'
                              : row.rocket === 'both'
                                ? 'bg-[#d4af37]/20 text-[#f4d98a]'
                                : 'bg-[#1bd6a0]/20 text-[#1bd6a0]'
                          }`}
                        >
                          {row.initials}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-medium text-xs leading-4">{row.name}</span>
                          <span className="text-[#a1a1a1] text-[10px]">
                            PKR {formatPkr(row.bet)} · {rocketLabel(row.rocket)}
                          </span>
                        </div>
                      </div>
                      {row.status === 'won' && row.mult != null ? (
                        <span className="text-[#1bd6a0] font-bold text-xs">{row.mult.toFixed(2)}×</span>
                      ) : (
                        <span className="font-bold text-[#a1a1a1] text-xs">flying</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="backdrop-blur-md bg-[#0a0603]/60 border-white/10 border border-solid rounded-xl p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#a1a1a1] text-xs">Total in Play</span>
                  <span className="text-[#f4d98a] font-bold text-sm">PKR {formatPkr(totalStake)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#a1a1a1] text-xs">Potential Win</span>
                  <span className="text-[#1bd6a0] font-bold text-sm">PKR {formatPkr(Math.round(potentialWin))}</span>
                </div>
              </div>
            </aside>
          </div>

          <footer className="game-footer backdrop-blur-md shrink-0 bg-[#0a0603]/80 border-white/10 border-t border-solid flex px-8 py-3 justify-between items-center">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="bg-[#d4af37]/15 shrink-0 rounded-full flex px-3 py-1.5 items-center gap-2">
                <Trophy className="size-4 text-[#f4d98a]" />
                <span className="text-[#f4d98a] font-bold text-xs">LIVE WINS</span>
              </div>
              <div className="text-[#a1a1a1] text-xs flex items-center gap-4 overflow-hidden whitespace-nowrap">
                {LIVE_WINS.map((w, i) => (
                  <span key={w.name}>
                    {i > 0 && <span className="text-[#c41e3a] mr-4">•</span>}
                    <b className="text-neutral-50">{w.name}</b> won{' '}
                    <b className="text-[#1bd6a0]">PKR {formatPkr(w.amount)}</b> @ {w.mult.toFixed(2)}×
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-neutral-900 rounded-full border-white/10 border border-solid flex px-4 py-2 items-center gap-2 w-[280px]">
              <MessageCircle className="size-4 text-[#a1a1a1]" />
              <input
                className="bg-transparent outline-none text-neutral-50 text-xs flex-1"
                placeholder="Type a message..."
                readOnly
              />
              <Send className="size-4 text-[#d4af37]" />
            </div>
          </footer>
        </div>
        </div>
      </div>
    </div>
  )
}
