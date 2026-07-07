import { useEffect } from "react";
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
  Pickaxe,
  Plane,
  Radio,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { FallbackComponent } from "./CustomComponents";

export default function App() {
  return (
    <div>
      <div className="bg-[radial-gradient(circle_at_50%_-10%,oklch(0.28_0.06_40),oklch(0.145_0.02_30))] min-h-[887px] bg-neutral-950 text-neutral-50 flex flex-col w-full h-fit h-fit min-h-screen w-screen min-w-screen max-w-screen overflow-visible">
        <header className="border-white/10 border-t-0 border-r-0 border-b-1 border-l-0 border-solid flex px-8 py-4 justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="size-9 bg-gradient-to-br from-[#f4d98a] to-[#d4af37] rotate-45 shadow-[0_0_16px_rgba(212,175,55,0.4)] rounded-lg flex justify-center items-center">
                <Diamond className="size-4 -rotate-45 text-[#0a0603]" />
              </div>
              <span className="font-extrabold text-2xl leading-8 tracking-tight">
                Zee9
              </span>
            </div>
            <nav className="flex items-center gap-1">
              <button className="transition-colors font-medium rounded-lg text-[#a1a1a1] text-sm leading-5 flex px-3 py-2 items-center gap-2">
                <Pickaxe className="size-4" />
                Mines
              </button>
              <button className="transition-colors font-medium rounded-lg text-[#a1a1a1] text-sm leading-5 flex px-3 py-2 items-center gap-2">
                <Plane className="size-4" />
                Aviator
              </button>
              <button className="transition-colors font-medium rounded-lg text-[#a1a1a1] text-sm leading-5 flex px-3 py-2 items-center gap-2">
                <FallbackComponent className="size-4" />
                Teen Patti
              </button>
              <button className="transition-colors font-medium rounded-lg text-[#a1a1a1] text-sm leading-5 flex px-3 py-2 items-center gap-2">
                <Zap className="size-4" />
                WINGO
              </button>
              <button className="transition-colors font-medium rounded-lg text-[#a1a1a1] text-sm leading-5 flex px-3 py-2 items-center gap-2">
                <TrendingUp className="size-4" />
                DOUBLE CRASH
              </button>
              <button className="transition-colors font-medium rounded-lg text-[#a1a1a1] text-sm leading-5 flex px-3 py-2 items-center gap-2">
                <Zap className="size-4" />
                CRASH
              </button>
              <button className="bg-gradient-to-r from-[#f4d98a] to-[#d4af37] shadow-[0_0_18px_rgba(212,175,55,0.45)] font-bold rounded-lg text-[#0a0603] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                <Dices className="size-4" />7 UP DOWN
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-[#f4d98a] to-[#d4af37] shadow-[0_0_16px_rgba(212,175,55,0.4)] font-bold rounded-full text-[#0a0603] text-sm leading-5 flex px-4 py-2 items-center gap-2">
              <Wallet className="size-4" />
              PKR 24,850
            </div>
            <button className="size-9 rounded-full bg-neutral-800 text-[#a1a1a1] flex justify-center items-center">
              <History className="size-4" />
            </button>
            <button className="size-9 rounded-full bg-neutral-800 text-[#a1a1a1] flex justify-center items-center">
              <Settings className="size-4" />
            </button>
          </div>
        </header>
        <main className="flex px-8 py-6 flex-1 gap-6">
          <aside className="shrink-0 flex flex-col gap-4 w-65">
            <Card className="bg-neutral-900/80 border-white/10 border-0 border-solid p-4 gap-3">
              <CardHeader className="p-0 gap-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-[#f57f17]" />
                  <span className="font-bold text-sm leading-5">
                    How to Play
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex p-0 flex-col gap-3">
                <div className="flex items-start gap-2">
                  <span className="size-5 shrink-0 font-bold rounded-full bg-neutral-800 text-[11px] flex justify-center items-center">
                    1
                  </span>
                  <span className="text-[#a1a1a1] text-xs leading-4">
                    Pick 7 UP, 7 DOWN or Lucky 7 and set your stake.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="size-5 shrink-0 font-bold rounded-full bg-neutral-800 text-[11px] flex justify-center items-center">
                    2
                  </span>
                  <span className="text-[#a1a1a1] text-xs leading-4">
                    Roll two dice — the sum decides the result.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="size-5 shrink-0 font-bold rounded-full bg-neutral-800 text-[11px] flex justify-center items-center">
                    3
                  </span>
                  <span className="text-[#a1a1a1] text-xs leading-4">
                    Match your zone to win the payout.
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-neutral-900/80 border-white/10 border-0 border-solid p-4 gap-3">
              <CardHeader className="p-0 gap-0">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-[#f57f17]" />
                  <span className="font-bold text-sm leading-5">Bet Zones</span>
                </div>
              </CardHeader>
              <CardContent className="flex p-0 flex-col gap-2">
                <div className="rounded-lg bg-neutral-800/60 flex px-3 py-2 justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ChevronUp className="size-4 text-[#fbc02d]" />
                    <span className="font-medium text-xs leading-4">
                      7 UP · 8–12
                    </span>
                  </div>
                  <span className="font-bold text-[#fbc02d] text-xs leading-4">
                    2×
                  </span>
                </div>
                <div className="rounded-lg bg-neutral-800/60 flex px-3 py-2 justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="size-4 text-[#f57f17]" />
                    <span className="font-medium text-xs leading-4">
                      7 DOWN · 2–6
                    </span>
                  </div>
                  <span className="font-bold text-[#f57f17] text-xs leading-4">
                    2×
                  </span>
                </div>
                <div className="rounded-lg bg-neutral-800/60 flex px-3 py-2 justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-[#ffeb3b]" />
                    <span className="font-medium text-xs leading-4">
                      Lucky 7 · exact
                    </span>
                  </div>
                  <span className="font-bold text-[#ffeb3b] text-xs leading-4">
                    5×
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-neutral-900/80 border-white/10 border-0 border-solid p-4 gap-3">
              <CardHeader className="p-0 gap-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#f57f17]" />
                  <span className="font-bold text-sm leading-5">
                    Provably Fair
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex p-0 flex-col gap-2">
                <div className="text-[#a1a1a1] text-xs leading-4 flex items-center gap-2">
                  <Lock className="size-3.5" />
                  Dice locked before roll
                </div>
                <div className="text-[#a1a1a1] text-xs leading-4 flex items-center gap-2">
                  <CheckSquare className="size-3.5" />
                  Verifiable roll seed
                </div>
                <div className="text-[#a1a1a1] text-xs leading-4 flex items-center gap-2">
                  <RefreshCw className="size-3.5" />
                  New round every 12s
                </div>
              </CardContent>
            </Card>
            <Card className="bg-neutral-900/80 border-white/10 border-0 border-solid mt-auto p-4 gap-2">
              <CardContent className="flex p-0 flex-col gap-2">
                <div className="text-xs leading-4 flex justify-between items-center">
                  <span className="text-[#a1a1a1]">Your Win Rate</span>
                  <span className="font-bold text-[#fbc02d]">57%</span>
                </div>
                <div className="rounded-full bg-neutral-800 w-full h-1.5 overflow-hidden">
                  <div className="w-[57%] bg-gradient-to-r from-[#f57f17] to-[#ffeb3b] rounded-full h-full" />
                </div>
                <div className="text-xs leading-4 flex mt-1 justify-between items-center">
                  <span className="text-[#a1a1a1]">Rounds Played</span>
                  <span className="font-bold">246</span>
                </div>
              </CardContent>
            </Card>
          </aside>
          <section className="flex flex-col flex-1 gap-5">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <h1 className="bg-gradient-to-r from-[#ffeb3b] via-[#fbc02d] to-[#f57f17] bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(245,127,23,0.4)] font-extrabold text-5xl leading-12 tracking-tight">
                  7 UP DOWN
                </h1>
                <p className="text-[#a1a1a1] text-sm leading-5">
                  Roll the dice — bet above, below or exactly 7
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold rounded-full bg-[#ff6467]/20 text-[#ff6467] text-xs leading-4 flex px-3 py-1.5 items-center gap-2">
                  <span className="size-2 rounded-full bg-[#ff6467]" />
                  LIVE ROUND
                </span>
                <span className="font-medium rounded-full bg-neutral-800 text-[#a1a1a1] text-xs leading-4 px-3 py-1.5">
                  # Round 58412
                </span>
              </div>
            </div>
            <Card className="bg-[radial-gradient(circle_at_50%_20%,oklch(0.26_0.05_50),oklch(0.19_0.02_35))] relative border-white/10 border-0 border-solid p-6 flex-1 gap-5 overflow-hidden">
              <CardContent className="flex p-0 flex-col justify-center items-center gap-6">
                <div className="flex items-center gap-10">
                  <div className="size-24 bg-gradient-to-br from-[#ffeb3b] via-[#fbc02d] to-[#f57f17] shadow-[0_10px_30px_rgba(245,127,23,0.5),inset_0_2px_8px_rgba(255,255,255,0.6),inset_0_-6px_12px_rgba(0,0,0,0.25)] grid grid-cols-3 grid-rows-3 -rotate-6 rounded-2xl p-4 gap-1">
                    <span className="size-3 shadow-inner rounded-full bg-[#0a0603]" />
                    <span />
                    <span className="size-3 shadow-inner rounded-full bg-[#0a0603]" />
                    <span />
                    <span className="size-3 shadow-inner rounded-full bg-[#0a0603] justify-self-center" />
                    <span />
                    <span className="size-3 shadow-inner rounded-full bg-[#0a0603]" />
                    <span />
                    <span className="size-3 shadow-inner rounded-full bg-[#0a0603]" />
                  </div>
                  <div className="size-24 bg-gradient-to-br from-[#ffeb3b] via-[#fbc02d] to-[#f57f17] shadow-[0_10px_30px_rgba(245,127,23,0.5),inset_0_2px_8px_rgba(255,255,255,0.6),inset_0_-6px_12px_rgba(0,0,0,0.25)] grid grid-cols-3 grid-rows-3 rotate-6 rounded-2xl p-4 gap-1">
                    <span className="size-3 shadow-inner rounded-full bg-[#0a0603]" />
                    <span />
                    <span className="size-3 shadow-inner rounded-full bg-[#0a0603]" />
                    <span className="size-3 shadow-inner rounded-full bg-[#0a0603]" />
                    <span />
                    <span className="size-3 shadow-inner rounded-full bg-[#0a0603]" />
                    <span className="size-3 shadow-inner rounded-full bg-[#0a0603]" />
                    <span />
                    <span className="size-3 shadow-inner rounded-full bg-[#0a0603]" />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="relative size-40 bg-gradient-to-br from-[#ffeb3b] via-[#fbc02d] to-[#f57f17] shadow-[0_0_50px_rgba(255,235,59,0.55),inset_0_6px_16px_rgba(255,255,255,0.55),inset_0_-10px_20px_rgba(0,0,0,0.3)] rounded-full flex justify-center items-center">
                    <div className="size-10 blur-md rounded-full bg-white/40 absolute left-8 top-5" />
                    <span className="drop-shadow-sm font-black text-[#0a0603] text-7xl leading-18">
                      8
                    </span>
                  </div>
                  <span className="bg-gradient-to-r from-[#fbc02d] to-[#f57f17] shadow-[0_0_20px_rgba(251,192,45,0.5)] font-extrabold rounded-full text-[#0a0603] text-sm leading-5 px-5 py-2">
                    WIN · 7 UP · +PKR 200
                  </span>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-3 gap-4">
              <button className="group border-transparent transition-colors ring-2 ring-[#ffeb3b] shadow-[0_0_20px_rgba(255,235,59,0.3)] rounded-2xl bg-neutral-800/70 border-black/1 border-2 border-solid flex p-4 flex-col items-center gap-2">
                <div className="size-11 bg-gradient-to-br from-[#fbc02d] to-[#f57f17] shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_4px_8px_rgba(0,0,0,0.3)] rounded-full flex justify-center items-center">
                  <ChevronUp className="size-6 text-[#0a0603]" />
                </div>
                <span className="font-bold text-sm leading-5">7 UP</span>
                <span className="text-[#a1a1a1] text-xs leading-4">
                  Sum 8–12 · 2×
                </span>
              </button>
              <button className="group border-transparent transition-colors rounded-2xl bg-neutral-800/70 border-black/1 border-2 border-solid flex p-4 flex-col items-center gap-2">
                <div className="size-11 bg-gradient-to-br from-[#ffeb3b] to-[#fbc02d] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_4px_8px_rgba(0,0,0,0.3)] rounded-full flex justify-center items-center">
                  <Sparkles className="size-5 text-[#0a0603]" />
                </div>
                <span className="font-bold text-sm leading-5">LUCKY 7</span>
                <span className="text-[#a1a1a1] text-xs leading-4">
                  Exact 7 · 5×
                </span>
              </button>
              <button className="group border-transparent transition-colors rounded-2xl bg-neutral-800/70 border-black/1 border-2 border-solid flex p-4 flex-col items-center gap-2">
                <div className="size-11 bg-gradient-to-br from-[#f57f17] to-[#c41e3a] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_8px_rgba(0,0,0,0.3)] rounded-full flex justify-center items-center">
                  <ChevronDown className="size-6 text-white" />
                </div>
                <span className="font-bold text-sm leading-5">7 DOWN</span>
                <span className="text-[#a1a1a1] text-xs leading-4">
                  Sum 2–6 · 2×
                </span>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[#a1a1a1] text-xs leading-4 mr-1">
                  Stake
                </span>
                <button className="font-medium rounded-lg bg-neutral-800 text-sm leading-5 px-4 py-2">
                  50
                </button>
                <button className="font-bold rounded-lg bg-neutral-200 text-neutral-900 text-sm leading-5 px-4 py-2">
                  100
                </button>
                <button className="font-medium rounded-lg bg-neutral-800 text-sm leading-5 px-4 py-2">
                  500
                </button>
                <button className="font-medium rounded-lg bg-neutral-800 text-sm leading-5 px-4 py-2">
                  1000
                </button>
              </div>
              <button className="bg-gradient-to-r from-[#ffeb3b] via-[#fbc02d] to-[#f57f17] shadow-[0_0_28px_rgba(251,192,45,0.5)] transition font-extrabold rounded-xl text-[#0a0603] text-base leading-6 flex py-3.5 justify-center items-center flex-1 gap-2">
                <Dices className="size-5" />
                ROLL · BET PKR 100
              </button>
            </div>
          </section>
          <aside className="shrink-0 flex flex-col gap-4 w-70">
            <Card className="bg-neutral-900/80 border-white/10 border-0 border-solid p-4 gap-3">
              <CardHeader className="p-0 gap-0">
                <div className="flex items-center gap-2">
                  <History className="size-4 text-[#f57f17]" />
                  <span className="font-bold text-sm leading-5">
                    Round History
                  </span>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-6 p-0 gap-2">
                <span className="aspect-square font-bold rounded-full bg-[#fbc02d]/20 text-[#fbc02d] text-xs leading-4 flex justify-center items-center">
                  9
                </span>
                <span className="aspect-square font-bold rounded-full bg-[#f57f17]/20 text-[#f57f17] text-xs leading-4 flex justify-center items-center">
                  4
                </span>
                <span className="aspect-square font-bold rounded-full bg-[#ffeb3b]/25 text-[#ffeb3b] text-xs leading-4 flex justify-center items-center">
                  7
                </span>
                <span className="aspect-square font-bold rounded-full bg-[#fbc02d]/20 text-[#fbc02d] text-xs leading-4 flex justify-center items-center">
                  11
                </span>
                <span className="aspect-square font-bold rounded-full bg-[#f57f17]/20 text-[#f57f17] text-xs leading-4 flex justify-center items-center">
                  3
                </span>
                <span className="aspect-square font-bold rounded-full bg-[#fbc02d]/20 text-[#fbc02d] text-xs leading-4 flex justify-center items-center">
                  10
                </span>
                <span className="aspect-square font-bold rounded-full bg-[#f57f17]/20 text-[#f57f17] text-xs leading-4 flex justify-center items-center">
                  6
                </span>
                <span className="aspect-square font-bold rounded-full bg-[#fbc02d]/20 text-[#fbc02d] text-xs leading-4 flex justify-center items-center">
                  8
                </span>
                <span className="aspect-square font-bold rounded-full bg-[#f57f17]/20 text-[#f57f17] text-xs leading-4 flex justify-center items-center">
                  5
                </span>
                <span className="aspect-square font-bold rounded-full bg-[#fbc02d]/20 text-[#fbc02d] text-xs leading-4 flex justify-center items-center">
                  12
                </span>
                <span className="aspect-square font-bold rounded-full bg-[#f57f17]/20 text-[#f57f17] text-xs leading-4 flex justify-center items-center">
                  2
                </span>
                <span className="aspect-square font-bold rounded-full bg-[#fbc02d]/20 text-[#fbc02d] text-xs leading-4 flex justify-center items-center">
                  9
                </span>
              </CardContent>
            </Card>
            <Card className="bg-neutral-900/80 border-white/10 border-0 border-solid p-4 flex-1 gap-3">
              <CardHeader className="p-0 gap-0">
                <div className="flex items-center gap-2">
                  <Radio className="size-4 text-[#f57f17]" />
                  <span className="font-bold text-sm leading-5">
                    Live Bets Feed
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex p-0 flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="size-8 font-bold rounded-full bg-neutral-800 text-[11px] flex justify-center items-center">
                      AK
                    </span>
                    <div className="flex flex-col">
                      <span className="font-medium text-xs leading-4">
                        Ahmed_K
                      </span>
                      <span className="text-[#a1a1a1] text-[11px]">
                        PKR 500 · 7 UP
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-[#fbc02d] text-xs leading-4">
                    WON
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="size-8 font-bold rounded-full bg-neutral-800 text-[11px] flex justify-center items-center">
                      SN
                    </span>
                    <div className="flex flex-col">
                      <span className="font-medium text-xs leading-4">
                        Sana92
                      </span>
                      <span className="text-[#a1a1a1] text-[11px]">
                        PKR 200 · Lucky 7
                      </span>
                    </div>
                  </div>
                  <span className="font-medium text-[#a1a1a1] text-xs leading-4">
                    rolling
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="size-8 font-bold rounded-full bg-neutral-800 text-[11px] flex justify-center items-center">
                      BR
                    </span>
                    <div className="flex flex-col">
                      <span className="font-medium text-xs leading-4">
                        Bilal.R
                      </span>
                      <span className="text-[#a1a1a1] text-[11px]">
                        PKR 1,000 · 7 DOWN
                      </span>
                    </div>
                  </div>
                  <span className="font-medium text-[#ff6467] text-xs leading-4">
                    lost
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="size-8 font-bold rounded-full bg-neutral-800 text-[11px] flex justify-center items-center">
                      ZR
                    </span>
                    <div className="flex flex-col">
                      <span className="font-medium text-xs leading-4">
                        Zara_R
                      </span>
                      <span className="text-[#a1a1a1] text-[11px]">
                        PKR 300 · 7 UP
                      </span>
                    </div>
                  </div>
                  <span className="font-medium text-[#a1a1a1] text-xs leading-4">
                    rolling
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="size-8 font-bold rounded-full bg-neutral-800 text-[11px] flex justify-center items-center">
                      HM
                    </span>
                    <div className="flex flex-col">
                      <span className="font-medium text-xs leading-4">
                        Hamza_M
                      </span>
                      <span className="text-[#a1a1a1] text-[11px]">
                        PKR 150 · Lucky 7
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-[#fbc02d] text-xs leading-4">
                    WON
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="size-8 font-bold rounded-full bg-neutral-800 text-[11px] flex justify-center items-center">
                      FK
                    </span>
                    <div className="flex flex-col">
                      <span className="font-medium text-xs leading-4">
                        Faris_K
                      </span>
                      <span className="text-[#a1a1a1] text-[11px]">
                        PKR 750 · 7 UP
                      </span>
                    </div>
                  </div>
                  <span className="font-medium text-[#a1a1a1] text-xs leading-4">
                    rolling
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-neutral-900/80 border-white/10 border-0 border-solid p-4 gap-2">
              <CardContent className="flex p-0 flex-col gap-2">
                <div className="text-sm leading-5 flex justify-between items-center">
                  <span className="text-[#a1a1a1]">Total Stake</span>
                  <span className="font-bold">PKR 700</span>
                </div>
                <div className="text-sm leading-5 flex justify-between items-center">
                  <span className="text-[#a1a1a1]">Potential Win</span>
                  <span className="font-bold text-[#fbc02d]">PKR 3,500</span>
                </div>
              </CardContent>
            </Card>
          </aside>
        </main>
        <footer className="border-white/10 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex px-8 py-3 justify-between items-center">
          <div className="flex items-center gap-4 overflow-hidden">
            <span className="shrink-0 font-bold text-[#fbc02d] text-xs leading-4 flex items-center gap-2">
              <Trophy className="size-4" />
              LIVE WINS
            </span>
            <div className="text-xs leading-4 flex items-center gap-4">
              <span>
                <span className="font-bold">Ahmed_K</span>won
                <span className="font-bold text-[#fbc02d]">PKR 12,500</span>on 7
                UP
              </span>
              <span className="text-[#a1a1a1]">·</span>
              <span>
                <span className="font-bold">Sana92</span>won
                <span className="font-bold text-[#fbc02d]">PKR 4,500</span>on
                Lucky 7
              </span>
              <span className="text-[#a1a1a1]">·</span>
              <span>
                <span className="font-bold">Bilal.R</span>won
                <span className="font-bold text-[#fbc02d]">PKR 2,000</span>on 7
                DOWN
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-80">
            <div className="rounded-full bg-neutral-800 flex px-4 py-2 items-center flex-1 gap-2">
              <MessageCircle className="size-4 text-[#a1a1a1]" />
              <input
                className="bg-transparent outline-none text-xs leading-4 flex-1"
                placeholder="Type a message..."
              />
            </div>
            <button className="size-9 rounded-full bg-neutral-200 text-neutral-900 flex justify-center items-center">
              <Send className="size-4" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
