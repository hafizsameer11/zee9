import { useEffect } from "react";
import {
  BookOpen,
  Flame,
  Gem,
  History,
  MessageCircle,
  Minus,
  Pickaxe,
  Plane,
  Plus,
  RefreshCw,
  RotateCw,
  Send,
  Settings,
  Sparkles,
  Table,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

import { FallbackComponent } from "./CustomComponents";

export default function App() {
  return (
    <div>
      <div className="bg-neutral-950 text-neutral-50 w-full h-fit h-fit min-h-screen w-screen min-w-screen max-w-screen overflow-visible">
        <div className="bg-[radial-gradient(ellipse_at_top,oklch(0.22_0.05_25),oklch(0.145_0_0))] flex flex-col w-full h-270 overflow-hidden">
          <header className="bg-[oklch(0.18_0.03_25/.7)] backdrop-blur-sm shrink-0 border-white/10 border-t-0 border-r-0 border-b-1 border-l-0 border-solid flex px-8 justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="size-8 rotate-45 bg-[linear-gradient(135deg,#f4d98a,#d4af37)] shadow-[0_0_12px_rgba(212,175,55,.5)] rounded-sm" />
                <span className="font-bold text-xl leading-7 tracking-tight">
                  Zee9
                </span>
              </div>
              <nav className="flex items-center gap-1">
                <button className="rounded-lg text-[#a1a1a1] text-sm leading-5 flex px-3 py-2 items-center gap-2">
                  <Pickaxe className="size-4" />
                  Mines
                </button>
                <button className="rounded-lg text-[#a1a1a1] text-sm leading-5 flex px-3 py-2 items-center gap-2">
                  <Plane className="size-4" />
                  Aviator
                </button>
                <button className="rounded-lg text-[#a1a1a1] text-sm leading-5 flex px-3 py-2 items-center gap-2">
                  <FallbackComponent className="size-4" />
                  Teen Patti
                </button>
                <button className="rounded-lg text-[#a1a1a1] text-sm leading-5 flex px-3 py-2 items-center gap-2">
                  <Zap className="size-4 text-[#f4d98a]" />
                  WINGO
                </button>
                <button className="rounded-lg text-[#a1a1a1] text-sm leading-5 flex px-3 py-2 items-center gap-2">
                  <TrendingUp className="size-4" />
                  DOUBLE CRASH
                </button>
                <button className="font-semibold rounded-lg bg-neutral-800 text-neutral-50 text-sm leading-5 border-white/10 border-1 border-solid flex px-4 py-2 items-center gap-2">
                  <Zap className="size-4 text-[#f4d98a]" />
                  FORTUNE OX
                </button>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-[linear-gradient(135deg,#f4d98a,#d4af37)] shadow-[0_0_16px_rgba(212,175,55,.35)] rounded-full flex px-4 py-2 items-center gap-2">
                <Wallet className="size-4 text-[#1a0f02]" />
                <span className="font-bold text-[#1a0f02] text-sm leading-5">
                  PKR 24,850
                </span>
              </div>
              <button className="size-9 rounded-full text-[#a1a1a1] border-white/10 border-1 border-solid flex justify-center items-center">
                <History className="size-4" />
              </button>
              <button className="size-9 rounded-full text-[#a1a1a1] border-white/10 border-1 border-solid flex justify-center items-center">
                <Settings className="size-4" />
              </button>
            </div>
          </header>
          <div className="min-h-0 flex p-8 flex-1 gap-6">
            <aside className="shrink-0 flex flex-col gap-6 w-65">
              <Card className="bg-neutral-900/80 border-white/10 border-1 border-solid p-6 gap-4">
                <CardHeader className="p-0 gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-4 text-[#a1a1a1]" />
                    <span className="font-semibold text-sm leading-5">
                      How to Play
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex p-0 flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <span className="size-5 shrink-0 font-bold rounded-full bg-neutral-800 text-neutral-50 text-[10px] flex justify-center items-center">
                      1
                    </span>
                    <span className="text-[#a1a1a1] text-xs leading-4">
                      Set your bet and hit SPIN.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="size-5 shrink-0 font-bold rounded-full bg-neutral-800 text-neutral-50 text-[10px] flex justify-center items-center">
                      2
                    </span>
                    <span className="text-[#a1a1a1] text-xs leading-4">
                      Match 3+ symbols on a payline.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="size-5 shrink-0 font-bold rounded-full bg-neutral-800 text-neutral-50 text-[10px] flex justify-center items-center">
                      3
                    </span>
                    <span className="text-[#a1a1a1] text-xs leading-4">
                      Ox Wild triggers gold multipliers.
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-neutral-900/80 border-white/10 border-1 border-solid p-6 gap-4">
                <CardHeader className="p-0 gap-2">
                  <div className="flex items-center gap-2">
                    <Table className="size-4 text-[#a1a1a1]" />
                    <span className="font-semibold text-sm leading-5">
                      Paytable
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex p-0 flex-col gap-2">
                  <div className="rounded-lg bg-neutral-800 flex px-3 py-2 justify-between items-center">
                    <span className="text-xs leading-4 flex items-center gap-1.5">
                      <span className="size-4 bg-[radial-gradient(circle_at_30%_30%,#f4d98a,#8a5a1a)] rounded-full" />
                      Ox Wild
                    </span>
                    <span className="font-bold text-neutral-50 text-xs leading-4">
                      100×
                    </span>
                  </div>
                  <div className="rounded-lg bg-neutral-800 flex px-3 py-2 justify-between items-center">
                    <span className="text-xs leading-4 flex items-center gap-1.5">
                      <span className="size-4 bg-[radial-gradient(circle_at_30%_30%,#ffe08a,#b8860b)] rounded-full" />
                      Gold Coin
                    </span>
                    <span className="font-bold text-neutral-50 text-xs leading-4">
                      25×
                    </span>
                  </div>
                  <div className="rounded-lg bg-neutral-800 flex px-3 py-2 justify-between items-center">
                    <span className="text-xs leading-4 flex items-center gap-1.5">
                      <span className="size-4 bg-[linear-gradient(135deg,#e04141,#8a1a1a)] rounded-sm" />
                      Firecracker
                    </span>
                    <span className="font-bold text-neutral-50 text-xs leading-4">
                      15×
                    </span>
                  </div>
                  <div className="rounded-lg bg-neutral-800 flex px-3 py-2 justify-between items-center">
                    <span className="text-xs leading-4 flex items-center gap-1.5">
                      <span className="size-4 bg-[linear-gradient(135deg,#ffe08a,#b8860b)] rounded-sm" />
                      Gold Ingot
                    </span>
                    <span className="font-bold text-neutral-50 text-xs leading-4">
                      10×
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-neutral-900/80 border-white/10 border-1 border-solid p-6 flex-1 gap-4">
                <CardHeader className="p-0 gap-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="size-4 text-[#a1a1a1]" />
                    <span className="font-semibold text-sm leading-5">
                      Auto Spin Tips
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex p-0 flex-col gap-2">
                  <div className="text-xs leading-4 flex justify-between items-center">
                    <span className="text-[#a1a1a1]">Quick rounds</span>
                    <span className="font-semibold">10×</span>
                  </div>
                  <div className="text-xs leading-4 flex justify-between items-center">
                    <span className="text-[#a1a1a1]">Stop on big win</span>
                    <span className="font-semibold">50×+</span>
                  </div>
                  <div className="text-xs leading-4 flex justify-between items-center">
                    <span className="text-[#a1a1a1]">Balanced run</span>
                    <span className="font-semibold">50×</span>
                  </div>
                  <div className="rounded-lg bg-neutral-800 flex mt-2 p-3 flex-col gap-2">
                    <div className="text-xs leading-4 flex justify-between items-center">
                      <span className="text-[#a1a1a1]">Session RTP</span>
                      <span className="font-semibold text-[#1bd6a0]">
                        96.8%
                      </span>
                    </div>
                    <div className="rounded-full bg-neutral-800 h-1.5 overflow-hidden">
                      <div className="w-[68%] rounded-full bg-[#1bd6a0] h-full" />
                    </div>
                  </div>
                  <div className="rounded-lg bg-neutral-800 flex mt-2 p-3 flex-col gap-2">
                    <span className="uppercase text-[#a1a1a1] text-[10px] tracking-wide">
                      Volatility
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="rounded-full bg-[#c41e3a] flex-1 h-1.5" />
                      <span className="rounded-full bg-[#c41e3a] flex-1 h-1.5" />
                      <span className="rounded-full bg-[#c41e3a] flex-1 h-1.5" />
                      <span className="rounded-full bg-neutral-800 flex-1 h-1.5" />
                    </div>
                    <span className="text-[#a1a1a1] text-[10px]">
                      High — big swings, big wins
                    </span>
                  </div>
                </CardContent>
              </Card>
            </aside>
            <main className="min-w-0 flex flex-col flex-1 gap-6">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  <h1 className="bg-[linear-gradient(135deg,#f4d98a,#d4af37,#c41e3a)] bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(212,175,55,.45)] font-black text-6xl leading-[63px] tracking-tight">
                    FORTUNE OX
                  </h1>
                  <span className="text-[#a1a1a1] text-sm leading-5">
                    Match the golden ox — riches of the new year await
                  </span>
                </div>
                <div className="rounded-full bg-[#c41e3a]/20 border-[#c41e3a]/40 border-1 border-solid flex px-3 py-1.5 items-center gap-2">
                  <span className="size-2 animate-pulse rounded-full bg-[#c41e3a]" />
                  <span className="font-semibold text-neutral-50 text-xs leading-4">
                    READY TO SPIN
                  </span>
                </div>
              </div>
              <Card className="relative bg-[radial-gradient(ellipse_at_center,oklch(0.26_0.06_25),oklch(0.16_0.03_25))] shadow-[0_0_40px_rgba(0,0,0,.4)_inset] border-white/10 border-1 border-solid p-8 flex-1 gap-6 overflow-hidden">
                <div className="drop-shadow-[0_6px_16px_rgba(0,0,0,.6)] rotate-6 opacity-90 text-7xl leading-18 absolute right-8 -top-4">
                  🐂
                </div>
                <CardContent className="flex p-0 flex-col justify-center flex-1 gap-6">
                  <div className="bg-[oklch(0.18_0.02_25)] shadow-[0_8px_30px_rgba(0,0,0,.5)_inset] rounded-2xl border-white/10 border-1 border-solid p-4">
                    <div className="grid grid-cols-5 gap-3">
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_30%,oklch(0.32_0.06_25),oklch(0.2_0.04_25))] shadow-[inset_0_2px_6px_rgba(255,255,255,.08),inset_0_-6px_10px_rgba(0,0,0,.5),0_4px_10px_rgba(0,0,0,.4)] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.6)] rounded-xl text-5xl leading-12 flex justify-center items-center">
                        🐂
                      </div>
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_30%,oklch(0.34_0.06_55),oklch(0.2_0.04_45))] shadow-[inset_0_2px_6px_rgba(255,255,255,.08),inset_0_-6px_10px_rgba(0,0,0,.5),0_4px_10px_rgba(0,0,0,.4)] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.6)] rounded-xl text-5xl leading-12 flex justify-center items-center">
                        🪙
                      </div>
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_30%,oklch(0.34_0.08_25),oklch(0.2_0.05_25))] shadow-[inset_0_2px_6px_rgba(255,255,255,.08),inset_0_-6px_10px_rgba(0,0,0,.5),0_4px_10px_rgba(0,0,0,.4)] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.6)] rounded-xl text-5xl leading-12 flex justify-center items-center">
                        🧧
                      </div>
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_30%,oklch(0.34_0.06_55),oklch(0.2_0.04_45))] shadow-[inset_0_2px_6px_rgba(255,255,255,.08),inset_0_-6px_10px_rgba(0,0,0,.5),0_4px_10px_rgba(0,0,0,.4)] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.6)] rounded-xl text-5xl leading-12 flex justify-center items-center">
                        🏆
                      </div>
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_30%,oklch(0.3_0.04_25),oklch(0.2_0.03_25))] shadow-[inset_0_2px_6px_rgba(255,255,255,.08),inset_0_-6px_10px_rgba(0,0,0,.5),0_4px_10px_rgba(0,0,0,.4)] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.6)] font-black rounded-xl text-neutral-50 text-5xl leading-12 flex justify-center items-center">
                        A
                      </div>
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_30%,oklch(0.34_0.08_25),oklch(0.2_0.05_25))] shadow-[inset_0_2px_6px_rgba(255,255,255,.08),inset_0_-6px_10px_rgba(0,0,0,.5),0_4px_10px_rgba(0,0,0,.4)] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.6)] rounded-xl text-5xl leading-12 flex justify-center items-center">
                        🧧
                      </div>
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_28%,#ffe9a8,#d4af37,#a67c1a)] shadow-[0_0_28px_rgba(212,175,55,.7),inset_0_3px_8px_rgba(255,255,255,.5),inset_0_-8px_12px_rgba(120,80,10,.6)] ring-2 ring-[#fff3c8] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.4)] rounded-xl text-5xl leading-12 flex justify-center items-center">
                        🐂
                      </div>
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_28%,#ffe9a8,#d4af37,#a67c1a)] shadow-[0_0_28px_rgba(212,175,55,.7),inset_0_3px_8px_rgba(255,255,255,.5),inset_0_-8px_12px_rgba(120,80,10,.6)] ring-2 ring-[#fff3c8] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.4)] rounded-xl text-5xl leading-12 flex justify-center items-center">
                        🐂
                      </div>
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_28%,#ffe9a8,#d4af37,#a67c1a)] shadow-[0_0_28px_rgba(212,175,55,.7),inset_0_3px_8px_rgba(255,255,255,.5),inset_0_-8px_12px_rgba(120,80,10,.6)] ring-2 ring-[#fff3c8] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.4)] rounded-xl text-5xl leading-12 flex justify-center items-center">
                        🐂
                      </div>
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_28%,#ffe9a8,#d4af37,#a67c1a)] shadow-[0_0_28px_rgba(212,175,55,.7),inset_0_3px_8px_rgba(255,255,255,.5),inset_0_-8px_12px_rgba(120,80,10,.6)] ring-2 ring-[#fff3c8] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.4)] rounded-xl text-5xl leading-12 flex justify-center items-center">
                        🐂
                      </div>
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_30%,oklch(0.34_0.06_55),oklch(0.2_0.04_45))] shadow-[inset_0_2px_6px_rgba(255,255,255,.08),inset_0_-6px_10px_rgba(0,0,0,.5),0_4px_10px_rgba(0,0,0,.4)] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.6)] rounded-xl text-5xl leading-12 flex justify-center items-center">
                        🪙
                      </div>
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_30%,oklch(0.3_0.04_25),oklch(0.2_0.03_25))] shadow-[inset_0_2px_6px_rgba(255,255,255,.08),inset_0_-6px_10px_rgba(0,0,0,.5),0_4px_10px_rgba(0,0,0,.4)] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.6)] font-black rounded-xl text-neutral-50 text-5xl leading-12 flex justify-center items-center">
                        K
                      </div>
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_30%,oklch(0.34_0.06_55),oklch(0.2_0.04_45))] shadow-[inset_0_2px_6px_rgba(255,255,255,.08),inset_0_-6px_10px_rgba(0,0,0,.5),0_4px_10px_rgba(0,0,0,.4)] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.6)] rounded-xl text-5xl leading-12 flex justify-center items-center">
                        🏆
                      </div>
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_30%,oklch(0.3_0.04_25),oklch(0.2_0.03_25))] shadow-[inset_0_2px_6px_rgba(255,255,255,.08),inset_0_-6px_10px_rgba(0,0,0,.5),0_4px_10px_rgba(0,0,0,.4)] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.6)] font-black rounded-xl text-neutral-50 text-5xl leading-12 flex justify-center items-center">
                        Q
                      </div>
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_30%,oklch(0.34_0.08_25),oklch(0.2_0.05_25))] shadow-[inset_0_2px_6px_rgba(255,255,255,.08),inset_0_-6px_10px_rgba(0,0,0,.5),0_4px_10px_rgba(0,0,0,.4)] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.6)] rounded-xl text-5xl leading-12 flex justify-center items-center">
                        🧧
                      </div>
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_30%,oklch(0.34_0.06_55),oklch(0.2_0.04_45))] shadow-[inset_0_2px_6px_rgba(255,255,255,.08),inset_0_-6px_10px_rgba(0,0,0,.5),0_4px_10px_rgba(0,0,0,.4)] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.6)] rounded-xl text-5xl leading-12 flex justify-center items-center">
                        🪙
                      </div>
                      <div className="aspect-square bg-[radial-gradient(circle_at_35%_30%,oklch(0.3_0.04_25),oklch(0.2_0.03_25))] shadow-[inset_0_2px_6px_rgba(255,255,255,.08),inset_0_-6px_10px_rgba(0,0,0,.5),0_4px_10px_rgba(0,0,0,.4)] leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,.6)] font-black rounded-xl text-neutral-50 text-5xl leading-12 flex justify-center items-center">
                        J
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center items-center gap-3">
                    <div className="shadow-[0_0_20px_rgba(27,214,160,.2)] rounded-full bg-[#1bd6a0]/12 border-[#1bd6a0]/40 border-1 border-solid flex px-4 py-2 items-center gap-2">
                      <Sparkles className="size-4 text-[#1bd6a0]" />
                      <span className="font-bold text-[#1bd6a0] text-sm leading-5">
                        BIG WIN · PKR 12,500
                      </span>
                      <Sparkles className="size-4 text-[#1bd6a0]" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex p-0 justify-between items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-[oklch(0.22_0.02_25)] rounded-full border-white/10 border-1 border-solid flex px-2 py-1 items-center gap-2">
                      <button className="size-7 rounded-full text-[#a1a1a1] flex justify-center items-center">
                        <Minus className="size-4" />
                      </button>
                      <span className="font-semibold text-center text-sm leading-5 w-16">
                        PKR 100
                      </span>
                      <button className="size-7 rounded-full text-[#a1a1a1] flex justify-center items-center">
                        <Plus className="size-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button className="font-medium rounded-lg text-[#a1a1a1] text-xs leading-4 border-white/10 border-1 border-solid px-3 py-1.5">
                        50
                      </button>
                      <button className="font-medium rounded-lg bg-neutral-800 text-neutral-50 text-xs leading-4 border-white/10 border-1 border-solid px-3 py-1.5">
                        100
                      </button>
                      <button className="font-medium rounded-lg text-[#a1a1a1] text-xs leading-4 border-white/10 border-1 border-solid px-3 py-1.5">
                        500
                      </button>
                      <button className="font-medium rounded-lg text-[#a1a1a1] text-xs leading-4 border-white/10 border-1 border-solid px-3 py-1.5">
                        1000
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="uppercase text-[#a1a1a1] text-[10px] tracking-wide">
                        Last Win
                      </span>
                      <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                        PKR 12,500
                      </span>
                    </div>
                    <Button className="bg-[linear-gradient(135deg,#f4d98a,#d4af37)] shadow-[0_0_28px_rgba(212,175,55,.5)] font-black rounded-xl text-[#1a0f02] text-lg leading-7 px-10 h-14">
                      <RotateCw className="size-6" />
                      SPIN
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </main>
            <aside className="shrink-0 flex flex-col gap-6 w-70">
              <Card className="bg-neutral-900/80 border-white/10 border-1 border-solid p-6 gap-4">
                <CardHeader className="p-0 gap-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="size-4 text-[#a1a1a1]" />
                    <span className="font-semibold text-sm leading-5">
                      Recent Wins
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex p-0 flex-col gap-2">
                  <div className="rounded-lg bg-neutral-800 flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-7 font-bold rounded-full bg-[#c41e3a] text-white text-[10px] flex justify-center items-center">
                        AK
                      </span>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm leading-5">
                          Ahmed_K
                        </span>
                        <span className="text-[#a1a1a1] text-[10px]">
                          Ox Wild ×5
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                      PKR 12,500
                    </span>
                  </div>
                  <div className="rounded-lg bg-neutral-800 flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-7 font-bold rounded-full bg-neutral-800 text-neutral-50 text-[10px] flex justify-center items-center">
                        SN
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs leading-4">
                          Sana92
                        </span>
                        <span className="text-[#a1a1a1] text-[10px]">
                          Gold Coins
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                      PKR 4,200
                    </span>
                  </div>
                  <div className="rounded-lg bg-neutral-800 flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-7 font-bold rounded-full bg-[#c41e3a] text-white text-[10px] flex justify-center items-center">
                        BR
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs leading-4">
                          Bilal.R
                        </span>
                        <span className="text-[#a1a1a1] text-[10px]">
                          Firecrackers
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                      PKR 2,000
                    </span>
                  </div>
                  <div className="rounded-lg bg-neutral-800 flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-7 font-bold rounded-full bg-neutral-800 text-neutral-50 text-[10px] flex justify-center items-center">
                        FY
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs leading-4">
                          Fayza.Y
                        </span>
                        <span className="text-[#a1a1a1] text-[10px]">
                          Gold Ingot
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                      PKR 1,650
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-neutral-900/80 border-white/10 border-1 border-solid p-6 gap-4">
                <CardHeader className="p-0 gap-2">
                  <div className="flex items-center gap-2">
                    <Gem className="size-4 text-[#a1a1a1]" />
                    <span className="font-semibold text-sm leading-5">
                      Grand Jackpot
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex p-0 flex-col gap-2">
                  <span className="font-black text-neutral-50 text-2xl leading-8">
                    PKR 1,284,500
                  </span>
                  <div className="rounded-full bg-neutral-800 h-2 overflow-hidden">
                    <div className="w-[74%] bg-[linear-gradient(90deg,#c41e3a,#f4d98a)] rounded-full h-full" />
                  </div>
                  <span className="text-[#a1a1a1] text-[10px]">
                    74% to next drop
                  </span>
                </CardContent>
              </Card>
              <Card className="bg-neutral-900/80 border-white/10 border-1 border-solid p-6 flex-1 gap-4">
                <CardHeader className="p-0 gap-2">
                  <div className="flex items-center gap-2">
                    <Flame className="size-4 text-[#a1a1a1]" />
                    <span className="font-semibold text-sm leading-5">
                      Big Win History
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex p-0 flex-wrap content-start gap-2">
                  <span className="font-bold rounded-lg bg-neutral-800 text-neutral-50 text-xs leading-4 border-white/10 border-1 border-solid px-2.5 py-1">
                    125×
                  </span>
                  <span className="font-bold rounded-lg bg-neutral-800 text-[#1bd6a0] text-xs leading-4 border-white/10 border-1 border-solid px-2.5 py-1">
                    42×
                  </span>
                  <span className="font-bold rounded-lg bg-neutral-800 text-[#a1a1a1] text-xs leading-4 border-white/10 border-1 border-solid px-2.5 py-1">
                    8×
                  </span>
                  <span className="font-bold rounded-lg bg-neutral-800 text-neutral-50 text-xs leading-4 border-white/10 border-1 border-solid px-2.5 py-1">
                    98×
                  </span>
                  <span className="font-bold rounded-lg bg-neutral-800 text-[#a1a1a1] text-xs leading-4 border-white/10 border-1 border-solid px-2.5 py-1">
                    15×
                  </span>
                  <span className="font-bold rounded-lg bg-neutral-800 text-[#1bd6a0] text-xs leading-4 border-white/10 border-1 border-solid px-2.5 py-1">
                    30×
                  </span>
                  <span className="font-bold rounded-lg bg-neutral-800 text-[#a1a1a1] text-xs leading-4 border-white/10 border-1 border-solid px-2.5 py-1">
                    6×
                  </span>
                  <span className="font-bold rounded-lg bg-neutral-800 text-neutral-50 text-xs leading-4 border-white/10 border-1 border-solid px-2.5 py-1">
                    200×
                  </span>
                  <span className="font-bold rounded-lg bg-neutral-800 text-[#a1a1a1] text-xs leading-4 border-white/10 border-1 border-solid px-2.5 py-1">
                    12×
                  </span>
                  <span className="font-bold rounded-lg bg-neutral-800 text-[#1bd6a0] text-xs leading-4 border-white/10 border-1 border-solid px-2.5 py-1">
                    55×
                  </span>
                  <span className="font-bold rounded-lg bg-neutral-800 text-[#a1a1a1] text-xs leading-4 border-white/10 border-1 border-solid px-2.5 py-1">
                    9×
                  </span>
                  <span className="font-bold rounded-lg bg-neutral-800 text-neutral-50 text-xs leading-4 border-white/10 border-1 border-solid px-2.5 py-1">
                    76×
                  </span>
                  <div className="rounded-lg bg-neutral-800 flex mt-2 p-3 flex-col gap-2 w-full">
                    <span className="uppercase text-[#a1a1a1] text-[10px] tracking-wide">
                      Biggest today
                    </span>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm leading-5">
                        Ahmed_K
                      </span>
                      <span className="font-bold text-neutral-50 text-sm leading-5">
                        200×
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
          <footer className="bg-[oklch(0.18_0.03_25/.7)] backdrop-blur-sm shrink-0 border-white/10 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex px-8 justify-between items-center h-14">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="shrink-0 flex items-center gap-1.5">
                <Trophy className="size-4 text-[#1bd6a0]" />
                <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                  LIVE WINS
                </span>
              </div>
              <div className="text-[#a1a1a1] text-xs leading-4 flex items-center gap-4">
                <span>
                  <span className="font-semibold text-neutral-50">Ahmed_K</span>
                  won
                  <span className="font-semibold text-neutral-50">
                    PKR 12,500
                  </span>
                  on Ox Wild
                </span>
                <span className="opacity-40">·</span>
                <span>
                  <span className="font-semibold text-neutral-50">Sana92</span>
                  won
                  <span className="font-semibold text-neutral-50">
                    PKR 4,200
                  </span>
                  on Gold Coin
                </span>
                <span className="opacity-40">·</span>
                <span>
                  <span className="font-semibold text-neutral-50">Bilal.R</span>
                  won
                  <span className="font-semibold text-neutral-50">
                    PKR 2,000
                  </span>
                  on Firecracker
                </span>
              </div>
            </div>
            <div className="bg-[oklch(0.22_0.02_25)] rounded-full border-white/10 border-1 border-solid flex px-4 py-2 items-center gap-2 w-72">
              <MessageCircle className="size-4 text-[#a1a1a1]" />
              <input
                className="bg-transparent outline-none text-xs leading-4 flex-1"
                placeholder="Type a message..."
              />
              <Send className="size-4 text-[#a1a1a1]" />
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
