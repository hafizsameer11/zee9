import { useEffect } from "react";
import {
  BookOpen,
  Diamond,
  Dice5,
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
        <div className="min-h-[887px] bg-[radial-gradient(ellipse_at_top,oklch(0.18_0.05_340),oklch(0.12_0.02_20))] flex flex-col w-full">
          <header className="border-[oklch(0.75_0.15_85/0.25)] bg-[oklch(0.1_0.02_20/0.6)] border-black/1 border-t-0 border-r-0 border-b-1 border-l-0 border-solid flex px-8 py-4 justify-between items-center">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="size-9 bg-[linear-gradient(135deg,oklch(0.85_0.16_90),oklch(0.65_0.15_75))] rotate-45 shadow-[0_0_20px_oklch(0.75_0.15_85/0.5)] rounded-lg flex justify-center items-center">
                  <Diamond className="size-4 -rotate-45 text-[oklch(0.15_0.02_20)]" />
                </div>
                <span className="text-[oklch(0.85_0.16_90)] font-black text-2xl leading-8 tracking-tight">
                  Zee9
                </span>
              </div>
              <nav className="flex items-center gap-2">
                <button className="transition-colors rounded-full text-[#9f9fa9] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                  <Pickaxe className="size-4" />
                  Mines
                </button>
                <button className="transition-colors rounded-full text-[#9f9fa9] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                  <Plane className="size-4" />
                  Aviator
                </button>
                <button className="transition-colors rounded-full text-[#9f9fa9] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                  <FallbackComponent className="size-4" />
                  Teen Patti
                </button>
                <button className="transition-colors rounded-full text-[#9f9fa9] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                  <Zap className="size-4" />
                  WINGO
                </button>
                <button className="bg-[linear-gradient(135deg,oklch(0.6_0.28_340),oklch(0.5_0.25_300))] shadow-[0_0_24px_oklch(0.6_0.28_340/0.6)] font-bold rounded-full text-white text-sm leading-5 flex px-4 py-2 items-center gap-2">
                  <TrendingUp className="size-4" />
                  DOUBLE CRASH
                </button>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-[oklch(0.1_0.02_20)] border-[oklch(0.75_0.15_85/0.4)] rounded-full border-black/1 border-1 border-solid flex px-4 py-2 items-center gap-2">
                <Wallet className="size-4 text-[oklch(0.85_0.16_90)]" />
                <span className="text-[oklch(0.85_0.16_90)] font-bold text-sm leading-5">
                  PKR 24,850
                </span>
              </div>
              <button className="size-9 bg-[oklch(0.2_0.02_20)] rounded-full text-[#9f9fa9] flex justify-center items-center">
                <History className="size-4" />
              </button>
              <button className="size-9 bg-[oklch(0.2_0.02_20)] rounded-full text-[#9f9fa9] flex justify-center items-center">
                <Settings className="size-4" />
              </button>
            </div>
          </header>
          <div className="flex p-6 flex-1 gap-6">
            <aside className="shrink-0 flex flex-col gap-4 w-65">
              <Card className="bg-[oklch(0.15_0.02_20/0.6)] border-[oklch(0.6_0.28_340/0.25)] backdrop-blur-sm p-4 gap-3">
                <CardHeader className="p-0 gap-1">
                  <CardTitle className="text-base leading-6 flex items-center gap-2">
                    <BookOpen className="size-4 text-[oklch(0.6_0.28_340)]" />
                    How to Play
                  </CardTitle>
                  <p className="text-[#9f9fa9] text-xs leading-4">
                    Two rockets. Cash out before crash.
                  </p>
                </CardHeader>
                <CardContent className="p-0 gap-3">
                  <div className="text-xs leading-4 flex items-start gap-2">
                    <span className="size-5 shrink-0 bg-[oklch(0.6_0.28_340/0.2)] text-[oklch(0.7_0.28_340)] font-bold rounded-full flex justify-center items-center">
                      1
                    </span>
                    <span className="text-[#9f9fa9]">
                      Place a bet on either rocket before liftoff.
                    </span>
                  </div>
                  <div className="text-xs leading-4 flex items-start gap-2">
                    <span className="size-5 shrink-0 bg-[oklch(0.6_0.28_340/0.2)] text-[oklch(0.7_0.28_340)] font-bold rounded-full flex justify-center items-center">
                      2
                    </span>
                    <span className="text-[#9f9fa9]">
                      Multiplier rises as the rocket climbs higher.
                    </span>
                  </div>
                  <div className="text-xs leading-4 flex items-start gap-2">
                    <span className="size-5 shrink-0 bg-[oklch(0.6_0.28_340/0.2)] text-[oklch(0.7_0.28_340)] font-bold rounded-full flex justify-center items-center">
                      3
                    </span>
                    <span className="text-[#9f9fa9]">
                      Cash out before the rocket explodes to win.
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[oklch(0.15_0.02_20/0.6)] border-[oklch(0.55_0.25_300/0.25)] backdrop-blur-sm p-4 gap-3">
                <CardHeader className="p-0 gap-0">
                  <CardTitle className="text-sm leading-5 flex items-center gap-2">
                    <Zap className="size-4 text-[oklch(0.7_0.25_300)]" />
                    Auto Cashout Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 gap-2">
                  <div className="bg-[oklch(0.1_0.02_20/0.6)] rounded-lg flex p-2 justify-between items-center">
                    <span className="text-[#9f9fa9] text-xs leading-4">
                      Safe target
                    </span>
                    <span className="text-[oklch(0.75_0.17_162)] font-bold text-xs leading-4">
                      1.5×
                    </span>
                  </div>
                  <div className="bg-[oklch(0.1_0.02_20/0.6)] rounded-lg flex p-2 justify-between items-center">
                    <span className="text-[#9f9fa9] text-xs leading-4">
                      Balanced target
                    </span>
                    <span className="text-[oklch(0.77_0.19_70)] font-bold text-xs leading-4">
                      2.5×
                    </span>
                  </div>
                  <div className="bg-[oklch(0.1_0.02_20/0.6)] rounded-lg flex p-2 justify-between items-center">
                    <span className="text-[#9f9fa9] text-xs leading-4">
                      High risk target
                    </span>
                    <span className="text-[oklch(0.7_0.28_340)] font-bold text-xs leading-4">
                      10×+
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[oklch(0.15_0.02_20/0.6)] border-[oklch(0.6_0.28_340/0.25)] backdrop-blur-sm p-4 gap-3">
                <CardHeader className="p-0 gap-0">
                  <CardTitle className="text-sm leading-5 flex items-center gap-2">
                    <ShieldCheck className="size-4 text-[oklch(0.75_0.17_162)]" />
                    Provably Fair
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 gap-2">
                  <div className="text-[#9f9fa9] text-xs leading-4 flex items-center gap-2">
                    <Lock className="size-3" />
                    Bets lock at liftoff
                  </div>
                  <div className="text-[#9f9fa9] text-xs leading-4 flex items-center gap-2">
                    <Dice5 className="size-3" />
                    Verifiable crash seed
                  </div>
                  <div className="text-[#9f9fa9] text-xs leading-4 flex items-center gap-2">
                    <RefreshCw className="size-3" />
                    New round every 20s
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[oklch(0.15_0.02_20/0.6)] border-[oklch(0.55_0.25_300/0.25)] backdrop-blur-sm mt-auto p-4 gap-3">
                <CardContent className="p-0 gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[#9f9fa9] text-xs leading-4">
                      Your Win Rate
                    </span>
                    <span className="text-[oklch(0.75_0.17_162)] font-bold text-xs leading-4">
                      58%
                    </span>
                  </div>
                  <div className="bg-[oklch(0.1_0.02_20)] rounded-full h-1.5 overflow-hidden">
                    <div className="w-[58%] bg-[linear-gradient(90deg,oklch(0.6_0.28_340),oklch(0.7_0.25_300))] rounded-full h-full" />
                  </div>
                  <div className="flex pt-1 justify-between items-center">
                    <span className="text-[#9f9fa9] text-xs leading-4">
                      Rounds Played
                    </span>
                    <span className="font-bold text-xs leading-4">312</span>
                  </div>
                </CardContent>
              </Card>
            </aside>
            <main className="min-w-0 flex flex-col flex-1 gap-4">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <h1 className="bg-[linear-gradient(90deg,oklch(0.7_0.28_340),oklch(0.75_0.25_300))] bg-clip-text text-transparent font-black text-4xl leading-10 tracking-tight">
                    DOUBLE CRASH
                  </h1>
                  <p className="text-[#9f9fa9] text-sm leading-5">
                    Two rockets, double the thrill — cash out before they blow
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-[oklch(0.6_0.28_340/0.15)] border-[oklch(0.6_0.28_340/0.4)] rounded-full border-black/1 border-1 border-solid flex px-4 py-2 items-center gap-2">
                    <span className="size-2 bg-[oklch(0.7_0.19_22)] animate-pulse rounded-full" />
                    <span className="text-[oklch(0.75_0.19_22)] font-bold text-sm leading-5">
                      LIVE ROUND
                    </span>
                  </div>
                  <div className="bg-[oklch(0.1_0.02_20)] border-[oklch(0.55_0.25_300/0.3)] rounded-full text-[#9f9fa9] text-sm leading-5 border-black/1 border-1 border-solid px-4 py-2">
                    # Round 89231
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 min-h-0 flex-1 gap-4">
                <Card className="bg-[oklch(0.12_0.02_20)] border-[oklch(0.75_0.17_162/0.35)] relative p-0 gap-0 overflow-hidden">
                  <div className="bg-[linear-gradient(oklch(0.75_0.17_162/0.06)_1px,transparent_1px),linear-gradient(90deg,oklch(0.75_0.17_162/0.06)_1px,transparent_1px)] absolute inset-0" />
                  <div className="bg-[oklch(0.75_0.17_162/0.15)] border-[oklch(0.75_0.17_162/0.4)] rounded-full border-black/1 border-1 border-solid flex absolute left-4 top-4 px-3 py-1.5 items-center gap-2">
                    <Rocket className="size-4 text-[oklch(0.75_0.17_162)]" />
                    <span className="text-[oklch(0.75_0.17_162)] font-bold text-xs leading-4">
                      ROCKET A
                    </span>
                  </div>
                  <div className="flex absolute inset-0 justify-center items-center">
                    <div className="h-[62%] bg-[linear-gradient(to_top_right,oklch(0.75_0.17_162/0.25),transparent_60%)] absolute inset-x-6 bottom-6" />
                    <svg
                      viewBox="0 0 400 300"
                      className="absolute inset-0 w-full h-full"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M20 285 Q160 260 240 150 T370 40"
                        fill="none"
                        stroke="oklch(0.75 0.17 162)"
                        strokeWidth="4"
                      />
                    </svg>
                    <div className="top-[24%] right-[16%] absolute">
                      <div className="relative -rotate-45">
                        <div className="top-full left-1/2 -translate-x-1/2 bg-[linear-gradient(to_bottom,oklch(0.77_0.19_70),oklch(0.7_0.19_22/0))] blur-[2px] rounded-full absolute w-3 h-10" />
                        <Rocket className="size-9 text-[oklch(0.75_0.17_162)]" />
                      </div>
                    </div>
                    <span className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[oklch(0.8_0.17_162)] font-black text-6xl leading-15 absolute">
                      2.41×
                    </span>
                  </div>
                  <div className="bg-[oklch(0.1_0.02_20/0.85)] backdrop-blur-sm border-[oklch(0.75_0.17_162/0.25)] border-black/1 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex absolute inset-x-0 bottom-0 p-4 items-center gap-3">
                    <div className="flex items-center flex-1 gap-2">
                      <div className="bg-[oklch(0.16_0.02_20)] rounded-lg border-white/10 border-1 border-solid flex items-center overflow-hidden">
                        <button className="text-[#9f9fa9] px-3 py-2">
                          <Minus className="size-3" />
                        </button>
                        <span className="font-bold text-sm leading-5 px-3">
                          PKR 200
                        </span>
                        <button className="text-[#9f9fa9] px-3 py-2">
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <span className="text-[#9f9fa9] text-xs leading-4">
                        auto 2.0×
                      </span>
                    </div>
                    <button className="bg-[linear-gradient(135deg,oklch(0.75_0.17_162),oklch(0.6_0.15_162))] text-[oklch(0.12_0.02_20)] shadow-[0_0_20px_oklch(0.75_0.17_162/0.5)] font-bold rounded-lg text-sm leading-5 px-5 py-2.5">
                      CASH OUT · 482
                    </button>
                  </div>
                </Card>
                <Card className="bg-[oklch(0.12_0.02_20)] border-[oklch(0.6_0.28_340/0.35)] relative p-0 gap-0 overflow-hidden">
                  <div className="bg-[linear-gradient(oklch(0.6_0.28_340/0.06)_1px,transparent_1px),linear-gradient(90deg,oklch(0.6_0.28_340/0.06)_1px,transparent_1px)] absolute inset-0" />
                  <div className="bg-[oklch(0.6_0.28_340/0.15)] border-[oklch(0.6_0.28_340/0.4)] rounded-full border-black/1 border-1 border-solid flex absolute left-4 top-4 px-3 py-1.5 items-center gap-2">
                    <Rocket className="size-4 text-[oklch(0.7_0.28_340)]" />
                    <span className="text-[oklch(0.7_0.28_340)] font-bold text-xs leading-4">
                      ROCKET B
                    </span>
                  </div>
                  <div className="flex absolute inset-0 justify-center items-center">
                    <div className="h-[78%] bg-[linear-gradient(to_top_right,oklch(0.6_0.28_340/0.28),transparent_60%)] absolute inset-x-6 bottom-6" />
                    <svg
                      viewBox="0 0 400 300"
                      className="absolute inset-0 w-full h-full"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M20 285 Q140 270 220 120 T375 20"
                        fill="none"
                        stroke="oklch(0.65 0.28 340)"
                        strokeWidth="4"
                      />
                    </svg>
                    <div className="top-[10%] right-[10%] absolute">
                      <div className="relative -rotate-45">
                        <div className="top-full left-1/2 -translate-x-1/2 bg-[linear-gradient(to_bottom,oklch(0.77_0.19_70),oklch(0.7_0.19_22/0))] blur-[2px] rounded-full absolute w-3 h-12" />
                        <div className="bg-[radial-gradient(circle,oklch(0.7_0.28_340/0.4),transparent_70%)] rounded-full absolute -inset-3" />
                        <Rocket className="size-10 text-[oklch(0.7_0.28_340)]" />
                      </div>
                    </div>
                    <span className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[oklch(0.72_0.28_340)] font-black text-6xl leading-15 absolute">
                      5.87×
                    </span>
                  </div>
                  <div className="bg-[oklch(0.1_0.02_20/0.85)] backdrop-blur-sm border-[oklch(0.6_0.28_340/0.25)] border-black/1 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex absolute inset-x-0 bottom-0 p-4 items-center gap-3">
                    <div className="flex items-center flex-1 gap-2">
                      <div className="bg-[oklch(0.16_0.02_20)] rounded-lg border-white/10 border-1 border-solid flex items-center overflow-hidden">
                        <button className="text-[#9f9fa9] px-3 py-2">
                          <Minus className="size-3" />
                        </button>
                        <span className="font-bold text-sm leading-5 px-3">
                          PKR 500
                        </span>
                        <button className="text-[#9f9fa9] px-3 py-2">
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <span className="text-[#9f9fa9] text-xs leading-4">
                        auto 5.0×
                      </span>
                    </div>
                    <button className="bg-[linear-gradient(135deg,oklch(0.65_0.28_340),oklch(0.55_0.25_300))] shadow-[0_0_20px_oklch(0.65_0.28_340/0.5)] font-bold rounded-lg text-white text-sm leading-5 px-5 py-2.5">
                      CASH OUT · 2,935
                    </button>
                  </div>
                </Card>
              </div>
              <div className="flex items-center gap-4">
                <span className="shrink-0 text-[#9f9fa9] text-xs leading-4">
                  Quick Stake
                </span>
                <div className="flex items-center gap-2">
                  <button className="bg-[oklch(0.16_0.02_20)] rounded-lg text-[#9f9fa9] text-sm leading-5 border-white/10 border-1 border-solid px-4 py-2">
                    50
                  </button>
                  <button className="bg-[oklch(0.16_0.02_20)] rounded-lg text-[#9f9fa9] text-sm leading-5 border-white/10 border-1 border-solid px-4 py-2">
                    100
                  </button>
                  <button className="bg-[oklch(0.16_0.02_20)] rounded-lg text-[#9f9fa9] text-sm leading-5 border-white/10 border-1 border-solid px-4 py-2">
                    500
                  </button>
                  <button className="bg-[oklch(0.16_0.02_20)] rounded-lg text-[#9f9fa9] text-sm leading-5 border-white/10 border-1 border-solid px-4 py-2">
                    1000
                  </button>
                </div>
                <button className="bg-[linear-gradient(135deg,oklch(0.85_0.16_90),oklch(0.65_0.15_75))] text-[oklch(0.15_0.02_20)] shadow-[0_0_30px_oklch(0.75_0.15_85/0.5)] font-black rounded-xl text-base leading-6 flex ml-auto px-8 py-3 items-center gap-2">
                  <Rocket className="size-5" />
                  PLACE BOTH · PKR 700
                </button>
              </div>
            </main>
            <aside className="shrink-0 flex flex-col gap-4 w-70">
              <Card className="bg-[oklch(0.15_0.02_20/0.6)] border-[oklch(0.6_0.28_340/0.25)] backdrop-blur-sm p-4 gap-3">
                <CardHeader className="p-0 gap-0">
                  <CardTitle className="text-sm leading-5 flex items-center gap-2">
                    <History className="size-4 text-[oklch(0.7_0.28_340)]" />
                    Round History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="bg-[oklch(0.7_0.19_22/0.15)] text-[oklch(0.75_0.19_22)] font-bold text-center rounded-lg text-xs leading-4 py-1.5">
                      1.02×
                    </span>
                    <span className="bg-[oklch(0.75_0.17_162/0.15)] text-[oklch(0.75_0.17_162)] font-bold text-center rounded-lg text-xs leading-4 py-1.5">
                      3.44×
                    </span>
                    <span className="bg-[oklch(0.6_0.28_340/0.15)] text-[oklch(0.72_0.28_340)] font-bold text-center rounded-lg text-xs leading-4 py-1.5">
                      12.8×
                    </span>
                    <span className="bg-[oklch(0.7_0.19_22/0.15)] text-[oklch(0.75_0.19_22)] font-bold text-center rounded-lg text-xs leading-4 py-1.5">
                      1.31×
                    </span>
                    <span className="bg-[oklch(0.75_0.17_162/0.15)] text-[oklch(0.75_0.17_162)] font-bold text-center rounded-lg text-xs leading-4 py-1.5">
                      2.07×
                    </span>
                    <span className="bg-[oklch(0.75_0.17_162/0.15)] text-[oklch(0.75_0.17_162)] font-bold text-center rounded-lg text-xs leading-4 py-1.5">
                      4.60×
                    </span>
                    <span className="bg-[oklch(0.7_0.19_22/0.15)] text-[oklch(0.75_0.19_22)] font-bold text-center rounded-lg text-xs leading-4 py-1.5">
                      1.09×
                    </span>
                    <span className="bg-[oklch(0.6_0.28_340/0.15)] text-[oklch(0.72_0.28_340)] font-bold text-center rounded-lg text-xs leading-4 py-1.5">
                      8.15×
                    </span>
                    <span className="bg-[oklch(0.75_0.17_162/0.15)] text-[oklch(0.75_0.17_162)] font-bold text-center rounded-lg text-xs leading-4 py-1.5">
                      2.90×
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[oklch(0.15_0.02_20/0.6)] border-[oklch(0.55_0.25_300/0.25)] backdrop-blur-sm min-h-0 p-4 flex-1 gap-3">
                <CardHeader className="p-0 gap-0">
                  <CardTitle className="text-sm leading-5 flex items-center gap-2">
                    <Radio className="size-4 text-[oklch(0.75_0.17_162)]" />
                    Live Bets Feed
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 gap-2 overflow-hidden">
                  <div className="bg-[oklch(0.1_0.02_20/0.6)] rounded-lg flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-6 bg-[oklch(0.6_0.28_340/0.2)] text-[oklch(0.7_0.28_340)] font-bold rounded-full text-[10px] flex justify-center items-center">
                        AK
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs leading-4">
                          Ahmed_K
                        </span>
                        <span className="text-[#9f9fa9] text-[10px]">
                          PKR 500 · Rocket B
                        </span>
                      </div>
                    </div>
                    <span className="text-[oklch(0.75_0.17_162)] font-bold text-xs leading-4">
                      5.87×
                    </span>
                  </div>
                  <div className="bg-[oklch(0.1_0.02_20/0.6)] rounded-lg flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-6 bg-[oklch(0.75_0.17_162/0.2)] text-[oklch(0.75_0.17_162)] font-bold rounded-full text-[10px] flex justify-center items-center">
                        SN
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs leading-4">
                          Sana92
                        </span>
                        <span className="text-[#9f9fa9] text-[10px]">
                          PKR 200 · Rocket A
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-[#9f9fa9] text-xs leading-4">
                      flying
                    </span>
                  </div>
                  <div className="bg-[oklch(0.1_0.02_20/0.6)] rounded-lg flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-6 bg-[oklch(0.77_0.19_70/0.2)] text-[oklch(0.77_0.19_70)] font-bold rounded-full text-[10px] flex justify-center items-center">
                        BR
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs leading-4">
                          Bilal.R
                        </span>
                        <span className="text-[#9f9fa9] text-[10px]">
                          PKR 1,000 · Both
                        </span>
                      </div>
                    </div>
                    <span className="text-[oklch(0.7_0.28_340)] font-bold text-xs leading-4">
                      2.41×
                    </span>
                  </div>
                  <div className="bg-[oklch(0.1_0.02_20/0.6)] rounded-lg flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-6 bg-[oklch(0.6_0.28_340/0.2)] text-[oklch(0.7_0.28_340)] font-bold rounded-full text-[10px] flex justify-center items-center">
                        ZR
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs leading-4">
                          Zara_R
                        </span>
                        <span className="text-[#9f9fa9] text-[10px]">
                          PKR 300 · Rocket B
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-[#9f9fa9] text-xs leading-4">
                      flying
                    </span>
                  </div>
                  <div className="bg-[oklch(0.1_0.02_20/0.6)] rounded-lg flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-6 bg-[oklch(0.75_0.17_162/0.2)] text-[oklch(0.75_0.17_162)] font-bold rounded-full text-[10px] flex justify-center items-center">
                        HM
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs leading-4">
                          Hamza_M
                        </span>
                        <span className="text-[#9f9fa9] text-[10px]">
                          PKR 150 · Rocket A
                        </span>
                      </div>
                    </div>
                    <span className="text-[oklch(0.75_0.17_162)] font-bold text-xs leading-4">
                      1.98×
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[oklch(0.15_0.02_20/0.6)] border-[oklch(0.6_0.28_340/0.25)] backdrop-blur-sm p-4 gap-2">
                <CardContent className="p-0 gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[#9f9fa9] text-xs leading-4">
                      Total in Play
                    </span>
                    <span className="text-[oklch(0.85_0.16_90)] font-bold text-sm leading-5">
                      PKR 700
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9f9fa9] text-xs leading-4">
                      Potential Win
                    </span>
                    <span className="text-[oklch(0.75_0.17_162)] font-bold text-sm leading-5">
                      PKR 3,417
                    </span>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
          <footer className="border-[oklch(0.6_0.28_340/0.25)] bg-[oklch(0.1_0.02_20/0.6)] border-black/1 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex px-8 py-3 justify-between items-center">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="bg-[oklch(0.75_0.17_162/0.15)] shrink-0 rounded-full flex px-3 py-1.5 items-center gap-2">
                <Trophy className="size-4 text-[oklch(0.75_0.17_162)]" />
                <span className="text-[oklch(0.75_0.17_162)] font-bold text-xs leading-4">
                  LIVE WINS
                </span>
              </div>
              <div className="text-[#9f9fa9] text-xs leading-4 flex items-center gap-4">
                <span>
                  <b className="text-neutral-50">Ahmed_K</b>won
                  <b className="text-[oklch(0.75_0.17_162)]">PKR 12,500</b>@
                  5.87×
                </span>
                <span className="text-[oklch(0.6_0.28_340)]">•</span>
                <span>
                  <b className="text-neutral-50">Sana92</b>won
                  <b className="text-[oklch(0.75_0.17_162)]">PKR 900</b>@ 2.41×
                </span>
                <span className="text-[oklch(0.6_0.28_340)]">•</span>
                <span>
                  <b className="text-neutral-50">Bilal.R</b>won
                  <b className="text-[oklch(0.75_0.17_162)]">PKR 4,000</b>@
                  8.15×
                </span>
              </div>
            </div>
            <div className="bg-[oklch(0.16_0.02_20)] rounded-full border-white/10 border-1 border-solid flex px-4 py-2 items-center gap-2 w-70">
              <MessageCircle className="size-4 text-[#9f9fa9]" />
              <input
                className="bg-transparent outline-none text-neutral-50 text-xs leading-4 flex-1"
                placeholder="Type a message..."
              />
              <Send className="size-4 text-[oklch(0.7_0.28_340)]" />
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
