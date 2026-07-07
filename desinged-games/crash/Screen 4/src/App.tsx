import { useEffect } from "react";
import {
  BookOpen,
  Diamond,
  HandCoins,
  History,
  Lock,
  MessageCircle,
  Minus,
  Pickaxe,
  Plane,
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { FallbackComponent } from "./CustomComponents";

export default function App() {
  return (
    <div>
      <div className="bg-zinc-950 text-neutral-50 w-full h-fit h-fit min-h-screen w-screen min-w-screen max-w-screen overflow-visible">
        <div className="bg-[radial-gradient(ellipse_at_top,oklch(0.18_0.04_20),oklch(0.12_0.02_25))] flex flex-col w-full h-[887px] overflow-hidden">
          <header className="shrink-0 bg-[oklch(0.14_0.02_25)] border-white/10 border-t-0 border-r-0 border-b-1 border-l-0 border-solid flex px-8 justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="size-9 bg-[linear-gradient(135deg,#f4d98a,#d4af37)] rotate-45 shadow-[0_0_16px_rgba(212,175,55,0.5)] rounded-lg flex justify-center items-center">
                  <Diamond className="size-4 -rotate-45 text-[#0a0603]" />
                </div>
                <span className="font-extrabold text-xl leading-7 tracking-tight">
                  Zee9
                </span>
              </div>
              <nav className="flex items-center gap-1">
                <button className="transition-colors font-medium rounded-full text-[#9f9fa9] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                  <Pickaxe className="size-4" />
                  Mines
                </button>
                <button className="transition-colors font-medium rounded-full text-[#9f9fa9] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                  <Plane className="size-4" />
                  Aviator
                </button>
                <button className="transition-colors font-medium rounded-full text-[#9f9fa9] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                  <FallbackComponent className="size-4" />
                  Teen Patti
                </button>
                <button className="transition-colors font-medium rounded-full text-[#9f9fa9] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                  <Zap className="size-4" />
                  WINGO
                </button>
                <button className="transition-colors font-medium rounded-full text-[#9f9fa9] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                  <TrendingUp className="size-4" />
                  DOUBLE CRASH
                </button>
                <button className="bg-[linear-gradient(135deg,#1565c0,#2196f3)] shadow-[0_0_18px_rgba(21,101,192,0.6)] font-semibold rounded-full text-white text-sm leading-5 flex px-4 py-2 items-center gap-2">
                  <Zap className="size-4" />
                  CRASH
                </button>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-[oklch(0.21_0.006_285.885)] shadow-[0_0_14px_rgba(212,175,55,0.35)] rounded-full border-[#d4af37]/50 border-1 border-solid flex px-4 py-2 items-center gap-2">
                <Wallet className="size-4 text-[#f4d98a]" />
                <span className="font-bold text-[#f4d98a] text-sm leading-5">
                  PKR 24,850
                </span>
              </div>
              <button className="size-9 rounded-full bg-zinc-800 text-[#9f9fa9] flex justify-center items-center">
                <History className="size-4" />
              </button>
              <button className="size-9 rounded-full bg-zinc-800 text-[#9f9fa9] flex justify-center items-center">
                <Settings className="size-4" />
              </button>
            </div>
          </header>
          <div className="min-h-0 flex p-6 flex-1 gap-4">
            <aside className="shrink-0 flex flex-col gap-4 w-65">
              <Card className="bg-zinc-900/70 border-white/10 border-0 border-solid p-4 gap-3">
                <CardHeader className="p-0 gap-1">
                  <CardTitle className="font-semibold text-sm leading-5 flex items-center gap-2">
                    <BookOpen className="size-4 text-[#1565c0]" />
                    How to Play
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex p-0 flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <span className="size-5 shrink-0 font-bold rounded-full bg-[#1565c0]/20 text-[#5ea0f2] text-xs leading-4 flex justify-center items-center">
                      1
                    </span>
                    <p className="leading-relaxed text-[#9f9fa9] text-xs leading-4">
                      Place your bet before the rocket lifts off.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="size-5 shrink-0 font-bold rounded-full bg-[#1565c0]/20 text-[#5ea0f2] text-xs leading-4 flex justify-center items-center">
                      2
                    </span>
                    <p className="leading-relaxed text-[#9f9fa9] text-xs leading-4">
                      Watch the multiplier climb as it flies.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="size-5 shrink-0 font-bold rounded-full bg-[#1565c0]/20 text-[#5ea0f2] text-xs leading-4 flex justify-center items-center">
                      3
                    </span>
                    <p className="leading-relaxed text-[#9f9fa9] text-xs leading-4">
                      Cash out before it crashes to win big.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/70 border-white/10 border-0 border-solid p-4 gap-3">
                <CardHeader className="p-0 gap-0">
                  <CardTitle className="font-semibold text-sm leading-5 flex items-center gap-2">
                    <Zap className="size-4 text-[#f4d98a]" />
                    Auto Cashout Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex p-0 flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[#9f9fa9] text-xs leading-4">
                      Safe target
                    </span>
                    <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                      1.5×
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9f9fa9] text-xs leading-4">
                      Balanced target
                    </span>
                    <span className="font-bold text-[#5ea0f2] text-xs leading-4">
                      2.5×
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9f9fa9] text-xs leading-4">
                      High risk target
                    </span>
                    <span className="font-bold text-[#c41e3a] text-xs leading-4">
                      10×+
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/70 border-white/10 border-0 border-solid p-4 flex-1 gap-3">
                <CardHeader className="p-0 gap-0">
                  <CardTitle className="font-semibold text-sm leading-5 flex items-center gap-2">
                    <ShieldCheck className="size-4 text-[#1bd6a0]" />
                    Provably Fair
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex p-0 flex-col gap-3">
                  <div className="text-[#9f9fa9] text-xs leading-4 flex items-center gap-2">
                    <Lock className="size-3.5" />
                    Bets lock at liftoff
                  </div>
                  <div className="text-[#9f9fa9] text-xs leading-4 flex items-center gap-2">
                    <SquareCheck className="size-3.5" />
                    Verifiable crash seed
                  </div>
                  <div className="text-[#9f9fa9] text-xs leading-4 flex items-center gap-2">
                    <RefreshCw className="size-3.5" />
                    New round every 15s
                  </div>
                  <div className="border-white/10 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex mt-2 pt-3 flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[#9f9fa9] text-xs leading-4">
                        Your Win Rate
                      </span>
                      <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                        61%
                      </span>
                    </div>
                    <div className="rounded-full bg-zinc-800 h-1.5 overflow-hidden">
                      <div className="w-[61%] bg-[linear-gradient(90deg,#1565c0,#1bd6a0)] rounded-full h-full" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#9f9fa9] text-xs leading-4">
                        Rounds Played
                      </span>
                      <span className="font-bold text-xs leading-4">287</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
            <main className="min-w-0 flex flex-col flex-1 gap-4">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h1 className="bg-[linear-gradient(90deg,#5ea0f2,#1565c0)] bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(21,101,192,0.5)] font-extrabold text-5xl leading-12 tracking-tight">
                    CRASH
                  </h1>
                  <p className="text-[#9f9fa9] text-sm leading-5">
                    One rocket, infinite altitude — cash out before it blows
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-[#c41e3a]/15 border-[#c41e3a]/40 border-1 border-solid flex px-3 py-1.5 items-center gap-2">
                    <span className="size-2 animate-pulse rounded-full bg-[#c41e3a]" />
                    <span className="font-semibold text-[#e5546c] text-xs leading-4">
                      LIVE ROUND
                    </span>
                  </div>
                  <div className="rounded-full bg-zinc-800 border-white/10 border-1 border-solid px-3 py-1.5">
                    <span className="font-medium text-[#9f9fa9] text-xs leading-4">
                      # Round 94207
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#9f9fa9] text-xs leading-4 mr-1">
                  Recent
                </span>
                <span className="font-bold rounded-md bg-[#c41e3a]/15 text-[#e5546c] text-xs leading-4 px-2.5 py-1">
                  1.12×
                </span>
                <span className="font-bold rounded-md bg-[#1bd6a0]/15 text-[#1bd6a0] text-xs leading-4 px-2.5 py-1">
                  3.44×
                </span>
                <span className="font-bold rounded-md bg-[#1565c0]/20 text-[#5ea0f2] text-xs leading-4 px-2.5 py-1">
                  12.8×
                </span>
                <span className="font-bold rounded-md bg-[#c41e3a]/15 text-[#e5546c] text-xs leading-4 px-2.5 py-1">
                  1.31×
                </span>
                <span className="font-bold rounded-md bg-[#1bd6a0]/15 text-[#1bd6a0] text-xs leading-4 px-2.5 py-1">
                  2.07×
                </span>
                <span className="font-bold rounded-md bg-[#1565c0]/20 text-[#5ea0f2] text-xs leading-4 px-2.5 py-1">
                  4.60×
                </span>
                <span className="font-bold rounded-md bg-[#c41e3a]/15 text-[#e5546c] text-xs leading-4 px-2.5 py-1">
                  1.09×
                </span>
                <span className="font-bold rounded-md bg-[#1bd6a0]/15 text-[#1bd6a0] text-xs leading-4 px-2.5 py-1">
                  2.90×
                </span>
              </div>
              <Card className="relative bg-[radial-gradient(ellipse_at_bottom_left,oklch(0.2_0.06_255),oklch(0.13_0.02_25))] border-[#1565c0]/30 border-0 border-solid p-0 flex-1 gap-0 overflow-hidden">
                <div className="bg-[linear-gradient(oklch(1_0_0/0.06)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/0.06)_1px,transparent_1px)] absolute inset-0" />
                <svg
                  className="absolute inset-0 w-full h-full"
                  preserveAspectRatio="none"
                  viewBox="0 0 800 460"
                >
                  <defs>
                    <linearGradient id="curveFill" x1="0" x2="0" y1="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="oklch(0.6 0.2 255)"
                        stopOpacity="0.35"
                      />
                      <stop
                        offset="100%"
                        stopColor="oklch(0.6 0.2 255)"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 460 C 220 450 380 360 520 220 C 600 140 660 90 720 60 L 720 460 Z"
                    fill="url(#curveFill)"
                  />
                  <path
                    className="drop-shadow-[0_0_10px_rgba(94,160,242,0.8)]"
                    d="M0 460 C 220 450 380 360 520 220 C 600 140 660 90 720 60"
                    fill="none"
                    stroke="#5ea0f2"
                    strokeLinecap="round"
                    strokeWidth="5"
                  />
                </svg>
                <div className="size-14 bg-[radial-gradient(circle_at_35%_30%,#f4d98a,#d4af37_45%,#c41e3a_100%)] shadow-[0_0_28px_rgba(94,160,242,0.7)] -rotate-45 rounded-full flex absolute right-17.5 top-10 justify-center items-center">
                  <Rocket className="size-7 text-[#0a0603]" />
                </div>
                <div className="flex absolute inset-0 flex-col justify-center items-center gap-2">
                  <span className="drop-shadow-[0_0_24px_rgba(94,160,242,0.6)] font-extrabold text-[#5ea0f2] text-7xl leading-18 tracking-tight">
                    3.24×
                  </span>
                  <span className="font-medium uppercase text-[#9f9fa9] text-sm leading-5 tracking-widest">
                    Flying · Cash out now
                  </span>
                </div>
                <div className="rounded-full bg-[#1bd6a0]/15 border-[#1bd6a0]/40 border-1 border-solid flex absolute left-4 bottom-4 px-3 py-1.5 items-center gap-2">
                  <TrendingUp className="size-3.5 text-[#1bd6a0]" />
                  <span className="font-semibold text-[#1bd6a0] text-xs leading-4">
                    Cashed out · +PKR 648
                  </span>
                </div>
              </Card>
              <Card className="bg-zinc-900/80 border-white/10 border-0 border-solid p-4 gap-4">
                <CardContent className="flex p-0 items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[#9f9fa9] text-xs leading-4">
                      Bet
                    </span>
                    <div className="rounded-lg bg-zinc-800 border-white/10 border-1 border-solid flex items-center overflow-hidden">
                      <button className="size-9 text-[#9f9fa9] flex justify-center items-center">
                        <Minus className="size-4" />
                      </button>
                      <span className="font-bold text-sm leading-5 px-3">
                        PKR 200
                      </span>
                      <button className="size-9 text-[#9f9fa9] flex justify-center items-center">
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#9f9fa9] text-xs leading-4">
                      Auto cashout
                    </span>
                    <div className="rounded-lg bg-zinc-800 border-white/10 border-1 border-solid flex px-3 items-center h-9">
                      <span className="font-bold text-sm leading-5">2.00×</span>
                    </div>
                  </div>
                  <div className="flex ml-2 items-center gap-1">
                    <span className="text-[#9f9fa9] text-xs leading-4 mr-1">
                      Quick
                    </span>
                    <button className="font-semibold rounded-lg bg-zinc-800 text-xs leading-4 border-white/10 border-1 border-solid px-3 h-9">
                      50
                    </button>
                    <button className="font-semibold rounded-lg bg-zinc-800 text-xs leading-4 border-white/10 border-1 border-solid px-3 h-9">
                      100
                    </button>
                    <button className="font-semibold rounded-lg bg-zinc-800 text-xs leading-4 border-white/10 border-1 border-solid px-3 h-9">
                      500
                    </button>
                    <button className="font-semibold rounded-lg bg-zinc-800 text-xs leading-4 border-white/10 border-1 border-solid px-3 h-9">
                      1000
                    </button>
                  </div>
                  <div className="flex-1" />
                  <button className="bg-[linear-gradient(135deg,#f4d98a,#d4af37)] shadow-[0_0_22px_rgba(212,175,55,0.5)] font-extrabold rounded-xl text-[#0a0603] text-sm leading-5 flex px-8 items-center gap-2 h-11">
                    <Rocket className="size-4" />
                    BET · PKR 200
                  </button>
                  <button className="shadow-[0_0_22px_rgba(196,30,58,0.5)] font-extrabold rounded-xl bg-[#c41e3a] text-white text-sm leading-5 flex px-8 items-center gap-2 h-11">
                    <HandCoins className="size-4" />
                    CASH OUT · 648
                  </button>
                </CardContent>
              </Card>
            </main>
            <aside className="shrink-0 flex flex-col gap-4 w-70">
              <Card className="bg-zinc-900/70 border-white/10 border-0 border-solid p-4 gap-3">
                <CardHeader className="p-0 gap-0">
                  <CardTitle className="font-semibold text-sm leading-5 flex items-center gap-2">
                    <History className="size-4 text-[#5ea0f2]" />
                    Round History
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 p-0 gap-2">
                  <span className="font-bold text-center rounded-md bg-[#c41e3a]/15 text-[#e5546c] text-xs leading-4 py-1.5">
                    1.02×
                  </span>
                  <span className="font-bold text-center rounded-md bg-[#1bd6a0]/15 text-[#1bd6a0] text-xs leading-4 py-1.5">
                    3.44×
                  </span>
                  <span className="font-bold text-center rounded-md bg-[#1565c0]/20 text-[#5ea0f2] text-xs leading-4 py-1.5">
                    12.8×
                  </span>
                  <span className="font-bold text-center rounded-md bg-[#c41e3a]/15 text-[#e5546c] text-xs leading-4 py-1.5">
                    1.31×
                  </span>
                  <span className="font-bold text-center rounded-md bg-[#1bd6a0]/15 text-[#1bd6a0] text-xs leading-4 py-1.5">
                    2.07×
                  </span>
                  <span className="font-bold text-center rounded-md bg-[#1565c0]/20 text-[#5ea0f2] text-xs leading-4 py-1.5">
                    4.60×
                  </span>
                  <span className="font-bold text-center rounded-md bg-[#c41e3a]/15 text-[#e5546c] text-xs leading-4 py-1.5">
                    1.09×
                  </span>
                  <span className="font-bold text-center rounded-md bg-[#1565c0]/20 text-[#5ea0f2] text-xs leading-4 py-1.5">
                    8.15×
                  </span>
                  <span className="font-bold text-center rounded-md bg-[#1bd6a0]/15 text-[#1bd6a0] text-xs leading-4 py-1.5">
                    2.90×
                  </span>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/70 border-white/10 border-0 border-solid p-4 flex-1 gap-3 overflow-hidden">
                <CardHeader className="p-0 gap-0">
                  <CardTitle className="font-semibold text-sm leading-5 flex items-center gap-2">
                    <Radio className="size-4 text-[#1bd6a0]" />
                    Live Bets Feed
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex p-0 flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-8 font-bold rounded-full bg-[#1565c0]/25 text-[#5ea0f2] text-xs leading-4 flex justify-center items-center">
                        AK
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs leading-4">
                          Ahmed_K
                        </span>
                        <span className="text-[#9f9fa9] text-[10px]">
                          PKR 500
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                      5.87×
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-8 font-bold rounded-full bg-[#c41e3a]/25 text-[#e5546c] text-xs leading-4 flex justify-center items-center">
                        SN
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs leading-4">
                          Sana92
                        </span>
                        <span className="text-[#9f9fa9] text-[10px]">
                          PKR 200
                        </span>
                      </div>
                    </div>
                    <span className="font-medium text-[#5ea0f2] text-xs leading-4">
                      flying
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-8 font-bold rounded-full bg-[#f4d98a]/25 text-[#f4d98a] text-xs leading-4 flex justify-center items-center">
                        BR
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs leading-4">
                          Bilal.R
                        </span>
                        <span className="text-[#9f9fa9] text-[10px]">
                          PKR 1,000
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                      2.41×
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-8 font-bold rounded-full bg-[#1565c0]/25 text-[#5ea0f2] text-xs leading-4 flex justify-center items-center">
                        ZR
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs leading-4">
                          Zara_R
                        </span>
                        <span className="text-[#9f9fa9] text-[10px]">
                          PKR 300
                        </span>
                      </div>
                    </div>
                    <span className="font-medium text-[#5ea0f2] text-xs leading-4">
                      flying
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-8 font-bold rounded-full bg-[#1bd6a0]/25 text-[#1bd6a0] text-xs leading-4 flex justify-center items-center">
                        HM
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs leading-4">
                          Hamza_M
                        </span>
                        <span className="text-[#9f9fa9] text-[10px]">
                          PKR 150
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                      1.98×
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-8 font-bold rounded-full bg-[#c41e3a]/25 text-[#e5546c] text-xs leading-4 flex justify-center items-center">
                        FK
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs leading-4">
                          Faris_K
                        </span>
                        <span className="text-[#9f9fa9] text-[10px]">
                          PKR 750
                        </span>
                      </div>
                    </div>
                    <span className="font-medium text-[#5ea0f2] text-xs leading-4">
                      flying
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/70 border-white/10 border-0 border-solid p-4 gap-2">
                <CardContent className="flex p-0 flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[#9f9fa9] text-xs leading-4">
                      Total in Play
                    </span>
                    <span className="font-bold text-sm leading-5">PKR 700</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9f9fa9] text-xs leading-4">
                      Potential Win
                    </span>
                    <span className="font-bold text-[#f4d98a] text-sm leading-5">
                      PKR 3,417
                    </span>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
          <footer className="shrink-0 bg-[oklch(0.14_0.02_25)] border-white/10 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex px-8 justify-between items-center h-14">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="shrink-0 flex items-center gap-2">
                <Trophy className="size-4 text-[#1bd6a0]" />
                <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                  LIVE WINS
                </span>
              </div>
              <span className="text-[#9f9fa9] text-xs leading-4">
                <span className="font-semibold text-neutral-50">Ahmed_K</span>
                won<span className="font-bold text-[#1bd6a0]">PKR 12,500</span>@
                5.87×
              </span>
              <span className="text-[#9f9fa9]">·</span>
              <span className="text-[#9f9fa9] text-xs leading-4">
                <span className="font-semibold text-neutral-50">Sana92</span>won
                <span className="font-bold text-[#1bd6a0]">PKR 900</span>@ 2.41×
              </span>
              <span className="text-[#9f9fa9]">·</span>
              <span className="text-[#9f9fa9] text-xs leading-4">
                <span className="font-semibold text-neutral-50">Bilal.R</span>
                won<span className="font-bold text-[#1bd6a0]">PKR 4,000</span>@
                8.15×
              </span>
            </div>
            <div className="shrink-0 flex items-center gap-2 w-80">
              <div className="rounded-full bg-zinc-800 border-white/10 border-1 border-solid flex px-3 items-center flex-1 gap-2 h-9">
                <MessageCircle className="size-4 text-[#9f9fa9]" />
                <input
                  className="bg-transparent outline-none text-xs leading-4 flex-1"
                  placeholder="Type a message..."
                />
              </div>
              <button className="size-9 rounded-full bg-[#1565c0] text-white flex justify-center items-center">
                <Send className="size-4" />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
