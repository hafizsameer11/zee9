import { useEffect } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  Crown,
  Diamond,
  Gift,
  Hash,
  History,
  Info,
  Layers,
  MessageCircle,
  Pickaxe,
  Plane,
  Send,
  Settings,
  ShieldCheck,
  Ticket,
  Timer,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { FallbackComponent } from "./CustomComponents";

export default function App() {
  return (
    <div>
      <div className="bg-neutral-950 text-neutral-50 w-full h-fit h-fit min-h-screen w-screen min-w-screen max-w-screen overflow-visible">
        <div className="bg-[radial-gradient(ellipse_at_top,oklch(0.22_0.04_40),oklch(0.145_0.01_40))] flex flex-col w-full h-270 overflow-hidden">
          <header className="backdrop-blur-md shrink-0 bg-[#0a0603]/80 border-white/10 border-t-0 border-r-0 border-b-1 border-l-0 border-solid flex px-8 py-4 justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-gradient-to-br from-[#f4d98a] to-[#d4af37] shadow-[0_0_18px_rgba(212,175,55,0.5)] rounded-xl flex justify-center items-center">
                <Diamond className="size-5 text-[#0a0603]" />
              </div>
              <span className="bg-gradient-to-r from-[#f4d98a] to-[#d4af37] bg-clip-text text-transparent font-black text-2xl leading-8 tracking-tight">
                Zee9
              </span>
            </div>
            <nav className="flex items-center gap-2">
              <button className="transition-colors font-semibold rounded-full text-[#a1a1a1] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                <Pickaxe className="size-4" />
                Mines
              </button>
              <button className="transition-colors font-semibold rounded-full text-[#a1a1a1] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                <Plane className="size-4" />
                Aviator
              </button>
              <button className="transition-colors font-semibold rounded-full text-[#a1a1a1] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                <FallbackComponent className="size-4" />
                Teen Patti
              </button>
              <button className="font-bold rounded-full bg-neutral-800 text-neutral-50 text-sm leading-5 border-white/15 border-1 border-solid flex px-4 py-2 items-center gap-2">
                <Zap className="size-4 text-[#f4d98a]" />
                WINGO
              </button>
              <button className="transition-colors font-semibold rounded-full text-[#a1a1a1] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                <Crown className="size-4" />
                Premium
              </button>
            </nav>
            <div className="flex items-center gap-3">
              <div className="shadow-[0_0_16px_rgba(212,175,55,0.25)] rounded-full bg-[#0a0603]/70 border-[#d4af37]/50 border-1 border-solid flex px-4 py-2 items-center gap-2">
                <Wallet className="size-4 text-[#d4af37]" />
                <span className="font-bold text-[#f4d98a] text-sm leading-5">
                  PKR 24,850
                </span>
              </div>
              <button className="size-9 transition-colors rounded-full bg-neutral-800 text-[#a1a1a1] border-white/10 border-1 border-solid flex justify-center items-center">
                <History className="size-4" />
              </button>
              <button className="size-9 transition-colors rounded-full bg-neutral-800 text-[#a1a1a1] border-white/10 border-1 border-solid flex justify-center items-center">
                <Settings className="size-4" />
              </button>
            </div>
          </header>
          <div className="min-h-0 flex p-6 flex-1 gap-6">
            <aside className="shrink-0 flex flex-col gap-6 w-72">
              <Card className="backdrop-blur-md bg-[#0a0603]/60 border-white/10 border-1 border-solid p-6 gap-4">
                <CardHeader className="p-0 gap-1">
                  <CardTitle className="text-neutral-50 text-base leading-6 flex items-center gap-2">
                    <BookOpen className="size-4 text-[#a1a1a1]" />
                    How to Play
                  </CardTitle>
                  <CardDescription className="text-xs leading-4">
                    Pick and win big
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex p-0 flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="font-bold uppercase text-[#a1a1a1] text-xs leading-4 tracking-wide">
                      Color
                    </span>
                    <div className="rounded-lg bg-neutral-800/60 border-white/10 border-1 border-solid flex p-2 justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="size-5 bg-[radial-gradient(circle_at_30%_25%,#a5e3ab,#5cc264_45%,#2e7d32)] shadow-[inset_0_-2px_4px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.6)] rounded-full" />
                        <span className="font-semibold text-xs leading-4">
                          Green
                        </span>
                      </div>
                      <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                        2×
                      </span>
                    </div>
                    <div className="rounded-lg bg-neutral-800/60 border-white/10 border-1 border-solid flex p-2 justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="size-5 bg-[radial-gradient(circle_at_30%_25%,#ff9b98,#ff5c58_45%,#c41e3a)] shadow-[inset_0_-2px_4px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.6)] rounded-full" />
                        <span className="font-semibold text-xs leading-4">
                          Red
                        </span>
                      </div>
                      <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                        2×
                      </span>
                    </div>
                    <div className="rounded-lg bg-neutral-800/60 border-white/10 border-1 border-solid flex p-2 justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="size-5 bg-[radial-gradient(circle_at_30%_25%,#e3aef0,#c765e0_45%,#9c27b0)] shadow-[inset_0_-2px_4px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.6)] rounded-full" />
                        <span className="font-semibold text-xs leading-4">
                          Violet
                        </span>
                      </div>
                      <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                        4.5×
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="font-bold uppercase text-[#a1a1a1] text-xs leading-4 tracking-wide">
                      Size
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-neutral-800/60 border-white/10 border-1 border-solid flex p-2 flex-col items-center">
                        <span className="font-bold text-neutral-50 text-xs leading-4">
                          BIG
                        </span>
                        <span className="text-[#a1a1a1] text-[10px]">
                          5–9 · 2×
                        </span>
                      </div>
                      <div className="rounded-lg bg-neutral-800/60 border-white/10 border-1 border-solid flex p-2 flex-col items-center">
                        <span className="font-bold text-neutral-50 text-xs leading-4">
                          SMALL
                        </span>
                        <span className="text-[#a1a1a1] text-[10px]">
                          0–4 · 2×
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-neutral-800/40 border-white/10 border-1 border-solid flex p-3 flex-col gap-1">
                    <span className="font-bold text-neutral-50 text-xs leading-4">
                      Number 0–9
                    </span>
                    <span className="text-[#a1a1a1] text-[11px]">
                      Match exact winning number for a huge
                    </span>
                    <span className="font-black text-[#f4d98a] text-lg leading-7">
                      9× payout
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="font-bold uppercase text-[#a1a1a1] text-xs leading-4 tracking-wide">
                      Quick Tips
                    </span>
                    <div className="rounded-lg bg-neutral-800/60 border-white/10 border-1 border-solid flex p-2 items-center gap-2">
                      <Timer className="size-4 shrink-0 text-[#a1a1a1]" />
                      <span className="text-[#a1a1a1] text-[11px] leading-4">
                        Bets lock 5s before draw
                      </span>
                    </div>
                    <div className="rounded-lg bg-neutral-800/60 border-white/10 border-1 border-solid flex p-2 items-center gap-2">
                      <Layers className="size-4 shrink-0 text-[#a1a1a1]" />
                      <span className="text-[#a1a1a1] text-[11px] leading-4">
                        Combine color + number picks
                      </span>
                    </div>
                    <div className="rounded-lg bg-neutral-800/60 border-white/10 border-1 border-solid flex p-2 items-center gap-2">
                      <ShieldCheck className="size-4 shrink-0 text-[#a1a1a1]" />
                      <span className="text-[#a1a1a1] text-[11px] leading-4">
                        Provably fair results
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-neutral-800/60 border-white/10 border-1 border-solid flex mt-auto p-3 flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[#a1a1a1] text-[11px] leading-4">
                        Your Win Rate
                      </span>
                      <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                        62%
                      </span>
                    </div>
                    <div className="rounded-full bg-[#0a0603] h-1.5 overflow-hidden">
                      <div className="w-[62%] rounded-full bg-[#1bd6a0] h-full" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#a1a1a1] text-[11px] leading-4">
                        Rounds Played
                      </span>
                      <span className="font-bold text-neutral-50 text-xs leading-4">
                        148
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
            <main className="min-w-0 flex flex-col items-center flex-1 gap-6">
              <div className="flex justify-between items-end w-full">
                <div className="flex flex-col gap-1">
                  <h1 className="bg-gradient-to-b from-[#fbe6a8] via-[#e8c766] to-[#c99b2e] bg-clip-text text-transparent drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] font-black text-6xl leading-15 tracking-tighter">
                    WINGO LOTTERY
                  </h1>
                  <p className="text-[#a1a1a1] text-base leading-6">
                    Pick color, size or number — 30s rounds
                  </p>
                </div>
                <div className="rounded-full bg-[#ff6467]/20 border-[#ff6467]/50 border-1 border-solid flex px-4 py-2 items-center gap-2">
                  <span className="size-2.5 animate-pulse shadow-[0_0_10px_rgba(229,57,53,0.9)] rounded-full bg-[#ff6467]" />
                  <span className="font-bold text-[#ff6467] text-sm leading-5 tracking-wide">
                    LIVE ROUND
                  </span>
                </div>
              </div>
              <div className="flex justify-center items-end gap-16 w-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-[#0a0603]/70 border-white/10 border-1 border-solid flex px-4 py-1.5 items-center gap-2">
                    <Hash className="size-3.5 text-[#a1a1a1]" />
                    <span className="font-bold text-neutral-50 text-sm leading-5">
                      Period 120458
                    </span>
                  </div>
                  <div className="relative size-56 bg-[conic-gradient(from_0deg,#1bd6a0_0deg,#1bd6a0_290deg,oklch(0.269_0_0)_290deg)] shadow-[0_0_50px_rgba(27,214,160,0.4)] rounded-full flex p-2 justify-center items-center">
                    <div className="relative size-full bg-[radial-gradient(circle_at_32%_26%,#a5e3ab,#5cc264_42%,#2e7d32_75%,#1f5c24)] shadow-[inset_0_-16px_32px_rgba(0,0,0,0.5),inset_0_4px_10px_rgba(255,255,255,0.35),0_0_0_2px_rgba(255,255,255,0.15)] rounded-full flex justify-center items-center overflow-hidden">
                      <span className="size-16 blur-xl rounded-full bg-white/50 absolute left-10 top-8" />
                      <span className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] leading-none font-black text-white text-8xl leading-24">
                        7
                      </span>
                    </div>
                  </div>
                  <span className="font-semibold uppercase text-[#a1a1a1] text-xs leading-4 tracking-wide">
                    Winning Number
                  </span>
                </div>
                <div className="flex pb-8 flex-col items-center gap-3">
                  <span className="font-bold uppercase text-[#a1a1a1] text-[11px] leading-4 tracking-widest">
                    Time Left
                  </span>
                  <div className="relative size-28 bg-[conic-gradient(from_0deg,oklch(0.708_0_0)_0deg,oklch(0.708_0_0)_264deg,oklch(0.269_0_0)_264deg)] shadow-[0_0_20px_rgba(0,0,0,0.4)] rounded-full flex p-1.5 justify-center items-center">
                    <div className="size-full rounded-full bg-[#0a0603] flex flex-col justify-center items-center">
                      <Clock className="size-4 text-[#a1a1a1] mb-0.5" />
                      <span className="tabular-nums font-black text-neutral-50 text-2xl leading-7">
                        00:24
                      </span>
                    </div>
                  </div>
                  <div className="rounded-full bg-neutral-800 w-40 h-1.5 overflow-hidden">
                    <div className="w-[80%] rounded-full bg-[#a1a1a1] h-full" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full">
                <button className="bg-gradient-to-br from-[#5cc264] to-[#2e7d32] shadow-[0_4px_16px_rgba(67,160,71,0.35)] transition font-bold rounded-xl text-white flex py-3 justify-center items-center flex-1 gap-2">
                  <span className="size-4 rounded-full bg-white/30" />
                  GREEN<span className="opacity-80 text-xs leading-4">2×</span>
                </button>
                <button className="bg-gradient-to-br from-[#ff5c58] to-[#c41e3a] shadow-[0_4px_16px_rgba(229,57,53,0.35)] transition font-bold rounded-xl text-white flex py-3 justify-center items-center flex-1 gap-2">
                  <span className="size-4 rounded-full bg-white/30" />
                  RED<span className="opacity-80 text-xs leading-4">2×</span>
                </button>
                <button className="bg-gradient-to-br from-[#c765e0] to-[#9c27b0] shadow-[0_4px_16px_rgba(156,39,176,0.35)] ring-2 ring-foreground ring-offset-2 ring-offset-background transition font-bold rounded-xl text-white flex py-3 justify-center items-center flex-1 gap-2">
                  <span className="size-4 rounded-full bg-white/30" />
                  VIOLET
                  <span className="opacity-80 text-xs leading-4">4.5×</span>
                </button>
                <button className="transition font-bold rounded-xl bg-neutral-800 text-neutral-50 border-white/10 border-1 border-solid flex py-3 justify-center items-center flex-1 gap-2">
                  <ChevronUp className="size-4" />
                  BIG
                </button>
                <button className="transition font-bold rounded-xl bg-neutral-800 text-neutral-50 border-white/10 border-1 border-solid flex py-3 justify-center items-center flex-1 gap-2">
                  <ChevronDown className="size-4" />
                  SMALL
                </button>
              </div>
              <div className="grid grid-cols-5 gap-4 w-full">
                <button className="relative size-16 bg-[radial-gradient(circle_at_32%_26%,#e3aef0,#c765e0_42%,#9c27b0_75%,#7a1e8c)] shadow-[inset_0_-6px_12px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.5),0_0_0_1px_rgba(255,255,255,0.12),0_4px_10px_rgba(0,0,0,0.4)] transition leading-none font-black rounded-full text-white text-2xl leading-8 flex mx-auto justify-center items-center overflow-hidden">
                  <span className="size-6 blur-md rounded-full bg-white/50 absolute left-3 top-2" />
                  0
                </button>
                <button className="relative size-16 bg-[radial-gradient(circle_at_32%_26%,#a5e3ab,#5cc264_42%,#2e7d32_75%,#1f5c24)] shadow-[inset_0_-6px_12px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.5),0_0_0_1px_rgba(255,255,255,0.12),0_4px_10px_rgba(0,0,0,0.4)] transition leading-none font-black rounded-full text-white text-2xl leading-8 flex mx-auto justify-center items-center overflow-hidden">
                  <span className="size-6 blur-md rounded-full bg-white/50 absolute left-3 top-2" />
                  1
                </button>
                <button className="relative size-16 bg-[radial-gradient(circle_at_32%_26%,#ff9b98,#ff5c58_42%,#c41e3a_75%,#961528)] shadow-[inset_0_-6px_12px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.5),0_0_0_1px_rgba(255,255,255,0.12),0_4px_10px_rgba(0,0,0,0.4)] transition leading-none font-black rounded-full text-white text-2xl leading-8 flex mx-auto justify-center items-center overflow-hidden">
                  <span className="size-6 blur-md rounded-full bg-white/50 absolute left-3 top-2" />
                  2
                </button>
                <button className="relative size-16 bg-[radial-gradient(circle_at_32%_26%,#a5e3ab,#5cc264_42%,#2e7d32_75%,#1f5c24)] shadow-[inset_0_-6px_12px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.5),0_0_0_1px_rgba(255,255,255,0.12),0_4px_10px_rgba(0,0,0,0.4)] transition leading-none font-black rounded-full text-white text-2xl leading-8 flex mx-auto justify-center items-center overflow-hidden">
                  <span className="size-6 blur-md rounded-full bg-white/50 absolute left-3 top-2" />
                  3
                </button>
                <button className="relative size-16 bg-[radial-gradient(circle_at_32%_26%,#ff9b98,#ff5c58_42%,#c41e3a_75%,#961528)] shadow-[inset_0_-6px_12px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.5),0_0_0_1px_rgba(255,255,255,0.12),0_4px_10px_rgba(0,0,0,0.4)] transition leading-none font-black rounded-full text-white text-2xl leading-8 flex mx-auto justify-center items-center overflow-hidden">
                  <span className="size-6 blur-md rounded-full bg-white/50 absolute left-3 top-2" />
                  4
                </button>
                <button className="relative size-16 bg-[radial-gradient(circle_at_32%_26%,#e3aef0,#c765e0_42%,#9c27b0_75%,#7a1e8c)] shadow-[inset_0_-6px_12px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.5),0_0_0_1px_rgba(255,255,255,0.12),0_4px_10px_rgba(0,0,0,0.4)] transition leading-none font-black rounded-full text-white text-2xl leading-8 flex mx-auto justify-center items-center overflow-hidden">
                  <span className="size-6 blur-md rounded-full bg-white/50 absolute left-3 top-2" />
                  5
                </button>
                <button className="relative size-16 bg-[radial-gradient(circle_at_32%_26%,#ff9b98,#ff5c58_42%,#c41e3a_75%,#961528)] shadow-[inset_0_-6px_12px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.5),0_0_0_1px_rgba(255,255,255,0.12),0_4px_10px_rgba(0,0,0,0.4)] transition leading-none font-black rounded-full text-white text-2xl leading-8 flex mx-auto justify-center items-center overflow-hidden">
                  <span className="size-6 blur-md rounded-full bg-white/50 absolute left-3 top-2" />
                  6
                </button>
                <button className="relative size-16 bg-[radial-gradient(circle_at_32%_26%,#a5e3ab,#5cc264_42%,#2e7d32_75%,#1f5c24)] shadow-[inset_0_-6px_12px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.5),0_4px_10px_rgba(0,0,0,0.4)] ring-2 ring-foreground ring-offset-2 ring-offset-background transition leading-none font-black rounded-full text-white text-2xl leading-8 flex mx-auto justify-center items-center overflow-hidden">
                  <span className="size-6 blur-md rounded-full bg-white/50 absolute left-3 top-2" />
                  7
                </button>
                <button className="relative size-16 bg-[radial-gradient(circle_at_32%_26%,#ff9b98,#ff5c58_42%,#c41e3a_75%,#961528)] shadow-[inset_0_-6px_12px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.5),0_0_0_1px_rgba(255,255,255,0.12),0_4px_10px_rgba(0,0,0,0.4)] transition leading-none font-black rounded-full text-white text-2xl leading-8 flex mx-auto justify-center items-center overflow-hidden">
                  <span className="size-6 blur-md rounded-full bg-white/50 absolute left-3 top-2" />
                  8
                </button>
                <button className="relative size-16 bg-[radial-gradient(circle_at_32%_26%,#a5e3ab,#5cc264_42%,#2e7d32_75%,#1f5c24)] shadow-[inset_0_-6px_12px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.5),0_0_0_1px_rgba(255,255,255,0.12),0_4px_10px_rgba(0,0,0,0.4)] transition leading-none font-black rounded-full text-white text-2xl leading-8 flex mx-auto justify-center items-center overflow-hidden">
                  <span className="size-6 blur-md rounded-full bg-white/50 absolute left-3 top-2" />
                  9
                </button>
              </div>
              <div className="flex mt-auto items-center gap-4 w-full">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#a1a1a1] text-xs leading-4">
                    Stake
                  </span>
                  <button className="transition font-bold rounded-lg bg-neutral-800 text-neutral-50 text-sm leading-5 border-white/10 border-1 border-solid px-3 py-2">
                    50
                  </button>
                  <button className="font-bold rounded-lg bg-neutral-50 text-neutral-950 text-sm leading-5 px-3 py-2">
                    100
                  </button>
                  <button className="transition font-bold rounded-lg bg-neutral-800 text-neutral-50 text-sm leading-5 border-white/10 border-1 border-solid px-3 py-2">
                    500
                  </button>
                  <button className="transition font-bold rounded-lg bg-neutral-800 text-neutral-50 text-sm leading-5 border-white/10 border-1 border-solid px-3 py-2">
                    1000
                  </button>
                </div>
                <button className="bg-gradient-to-r from-[#f4d98a] via-[#d4af37] to-[#a8842a] shadow-[0_0_28px_rgba(212,175,55,0.55)] transition font-black rounded-xl text-[#0a0603] text-lg leading-7 flex py-3.5 justify-center items-center flex-1 gap-3">
                  <Coins className="size-5" />
                  PLACE BET · PKR 100
                </button>
              </div>
            </main>
            <aside className="shrink-0 flex flex-col gap-6 w-72">
              <Card className="backdrop-blur-md bg-[#0a0603]/60 border-white/10 border-1 border-solid p-6 gap-3">
                <CardHeader className="p-0 gap-0">
                  <CardTitle className="text-neutral-50 text-sm leading-5 flex items-center gap-2">
                    <Info className="size-4 text-[#a1a1a1]" />
                    Round Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex p-0 flex-col gap-2">
                  <div className="text-xs leading-4 flex justify-between items-center">
                    <span className="text-[#a1a1a1]">Current Bets</span>
                    <span className="font-bold">2</span>
                  </div>
                  <div className="text-xs leading-4 flex justify-between items-center">
                    <span className="text-[#a1a1a1]">Total Stake</span>
                    <span className="font-bold text-neutral-50">PKR 200</span>
                  </div>
                  <div className="flex pt-1 flex-wrap items-center gap-2">
                    <span className="bg-gradient-to-br from-[#c765e0] to-[#9c27b0] font-bold rounded-md text-white text-[10px] px-2 py-1">
                      VIOLET
                    </span>
                    <span className="bg-gradient-to-br from-[#5cc264] to-[#2e7d32] font-bold rounded-md text-white text-[10px] px-2 py-1">
                      NUM 7
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card className="backdrop-blur-md bg-[#0a0603]/60 border-white/10 border-1 border-solid p-6 gap-3">
                <CardHeader className="p-0 gap-0">
                  <CardTitle className="text-neutral-50 text-sm leading-5 flex items-center gap-2">
                    <History className="size-4 text-[#a1a1a1]" />
                    Result History
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-6 p-0 gap-2">
                  <span className="relative size-8 bg-[radial-gradient(circle_at_32%_26%,#a5e3ab,#5cc264_45%,#2e7d32)] shadow-[inset_0_-3px_5px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)] font-bold rounded-full text-white text-xs leading-4 flex justify-center items-center">
                    3
                  </span>
                  <span className="relative size-8 bg-[radial-gradient(circle_at_32%_26%,#ff9b98,#ff5c58_45%,#c41e3a)] shadow-[inset_0_-3px_5px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)] font-bold rounded-full text-white text-xs leading-4 flex justify-center items-center">
                    8
                  </span>
                  <span className="relative size-8 bg-[radial-gradient(circle_at_32%_26%,#e3aef0,#c765e0_45%,#9c27b0)] shadow-[inset_0_-3px_5px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)] font-bold rounded-full text-white text-xs leading-4 flex justify-center items-center">
                    5
                  </span>
                  <span className="relative size-8 bg-[radial-gradient(circle_at_32%_26%,#a5e3ab,#5cc264_45%,#2e7d32)] shadow-[inset_0_-3px_5px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)] font-bold rounded-full text-white text-xs leading-4 flex justify-center items-center">
                    1
                  </span>
                  <span className="relative size-8 bg-[radial-gradient(circle_at_32%_26%,#ff9b98,#ff5c58_45%,#c41e3a)] shadow-[inset_0_-3px_5px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)] font-bold rounded-full text-white text-xs leading-4 flex justify-center items-center">
                    6
                  </span>
                  <span className="relative size-8 bg-[radial-gradient(circle_at_32%_26%,#ff9b98,#ff5c58_45%,#c41e3a)] shadow-[inset_0_-3px_5px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)] font-bold rounded-full text-white text-xs leading-4 flex justify-center items-center">
                    2
                  </span>
                  <span className="relative size-8 bg-[radial-gradient(circle_at_32%_26%,#a5e3ab,#5cc264_45%,#2e7d32)] shadow-[inset_0_-3px_5px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)] font-bold rounded-full text-white text-xs leading-4 flex justify-center items-center">
                    9
                  </span>
                  <span className="relative size-8 bg-[radial-gradient(circle_at_32%_26%,#e3aef0,#c765e0_45%,#9c27b0)] shadow-[inset_0_-3px_5px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)] font-bold rounded-full text-white text-xs leading-4 flex justify-center items-center">
                    0
                  </span>
                  <span className="relative size-8 bg-[radial-gradient(circle_at_32%_26%,#a5e3ab,#5cc264_45%,#2e7d32)] shadow-[inset_0_-3px_5px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)] font-bold rounded-full text-white text-xs leading-4 flex justify-center items-center">
                    3
                  </span>
                  <span className="relative size-8 bg-[radial-gradient(circle_at_32%_26%,#ff9b98,#ff5c58_45%,#c41e3a)] shadow-[inset_0_-3px_5px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)] font-bold rounded-full text-white text-xs leading-4 flex justify-center items-center">
                    4
                  </span>
                  <span className="relative size-8 bg-[radial-gradient(circle_at_32%_26%,#a5e3ab,#5cc264_45%,#2e7d32)] shadow-[inset_0_-3px_5px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)] font-bold rounded-full text-white text-xs leading-4 flex justify-center items-center">
                    7
                  </span>
                  <span className="relative size-8 bg-[radial-gradient(circle_at_32%_26%,#ff9b98,#ff5c58_45%,#c41e3a)] shadow-[inset_0_-3px_5px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)] font-bold rounded-full text-white text-xs leading-4 flex justify-center items-center">
                    8
                  </span>
                </CardContent>
              </Card>
              <Card className="backdrop-blur-md bg-[#0a0603]/60 border-white/10 border-1 border-solid p-6 flex-1 gap-3">
                <CardHeader className="p-0 gap-0">
                  <CardTitle className="text-neutral-50 text-sm leading-5 flex items-center gap-2">
                    <Ticket className="size-4 text-[#a1a1a1]" />
                    My Bets
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex p-0 flex-col gap-2">
                  <div className="rounded-lg bg-neutral-800/60 border-white/10 border-1 border-solid flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-6 bg-[radial-gradient(circle_at_32%_26%,#e3aef0,#c765e0_45%,#9c27b0)] shadow-[inset_0_-2px_4px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)] rounded-full" />
                      <span className="font-semibold text-xs leading-4">
                        Violet
                      </span>
                    </div>
                    <span className="font-bold text-neutral-50 text-xs leading-4">
                      PKR 100
                    </span>
                  </div>
                  <div className="rounded-lg bg-neutral-800/60 border-white/10 border-1 border-solid flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="size-6 bg-[radial-gradient(circle_at_32%_26%,#a5e3ab,#5cc264_45%,#2e7d32)] shadow-[inset_0_-2px_4px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)] font-bold rounded-full text-white text-[10px] flex justify-center items-center">
                        7
                      </span>
                      <span className="font-semibold text-xs leading-4">
                        Number 7
                      </span>
                    </div>
                    <span className="font-bold text-neutral-50 text-xs leading-4">
                      PKR 100
                    </span>
                  </div>
                  <div className="text-xs leading-4 flex pt-1 justify-between items-center">
                    <span className="text-[#a1a1a1]">Potential Win</span>
                    <span className="font-black text-[#1bd6a0]">PKR 1,350</span>
                  </div>
                  <div className="rounded-lg bg-neutral-800/40 border-white/10 border-1 border-solid flex mt-2 p-3 flex-col gap-2">
                    <span className="font-bold uppercase text-[#a1a1a1] text-[10px] leading-4 tracking-wide">
                      Session Stats
                    </span>
                    <div className="flex justify-between items-center">
                      <span className="text-[#a1a1a1] text-[11px] leading-4">
                        Total Wagered
                      </span>
                      <span className="font-bold text-neutral-50 text-xs leading-4">
                        PKR 3,400
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#a1a1a1] text-[11px] leading-4">
                        Net Profit
                      </span>
                      <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                        +PKR 1,820
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#a1a1a1] text-[11px] leading-4">
                        Best Streak
                      </span>
                      <span className="font-bold text-neutral-50 text-xs leading-4">
                        5 wins
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-neutral-800/40 border-white/10 border-1 border-solid flex mt-auto p-3 flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Gift className="size-4 text-[#f4d98a]" />
                      <span className="font-bold text-neutral-50 text-xs leading-4">
                        Daily Bonus
                      </span>
                    </div>
                    <span className="text-[#a1a1a1] text-[11px] leading-4">
                      Play 3 more rounds to unlock a free bet
                    </span>
                    <div className="rounded-full bg-[#0a0603] h-1.5 overflow-hidden">
                      <div className="w-[70%] rounded-full bg-[#a1a1a1] h-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
          <footer className="backdrop-blur-md shrink-0 bg-[#0a0603]/80 border-white/10 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex px-8 py-4 justify-between items-center gap-6">
            <div className="min-w-0 flex items-center gap-3">
              <div className="shrink-0 rounded-full bg-[#1bd6a0]/15 border-[#1bd6a0]/40 border-1 border-solid flex px-3 py-1.5 items-center gap-1.5">
                <Trophy className="size-3.5 text-[#1bd6a0]" />
                <span className="font-bold text-[#1bd6a0] text-xs leading-4">
                  LIVE WINS
                </span>
              </div>
              <div className="whitespace-nowrap text-[#a1a1a1] text-xs leading-4 flex items-center gap-4 overflow-hidden">
                <span>
                  <span className="font-semibold text-neutral-50">Ahmed_K</span>
                  won<span className="font-bold text-[#1bd6a0]">PKR 4,500</span>
                  on Violet
                </span>
                <span className="text-[#a1a1a1]">•</span>
                <span>
                  <span className="font-semibold text-neutral-50">Sana92</span>
                  won<span className="font-bold text-[#1bd6a0]">PKR 900</span>on
                  Number 3
                </span>
                <span className="text-[#a1a1a1]">•</span>
                <span>
                  <span className="font-semibold text-neutral-50">Bilal.R</span>
                  won<span className="font-bold text-[#1bd6a0]">PKR 2,000</span>
                  on BIG
                </span>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2 w-80">
              <div className="rounded-full bg-neutral-800 border-white/10 border-1 border-solid flex px-3 py-2 items-center flex-1 gap-2">
                <MessageCircle className="size-4 text-[#a1a1a1]" />
                <input
                  placeholder="Type a message..."
                  className="bg-transparent outline-none text-sm leading-5 flex-1"
                />
              </div>
              <button className="size-9 rounded-full bg-neutral-800 text-neutral-50 border-white/10 border-1 border-solid flex justify-center items-center">
                <Send className="size-4" />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
