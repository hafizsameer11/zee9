import { useEffect } from "react";
import {
  Bomb,
  Coins,
  Crown,
  Flame,
  Gem,
  HandCoins,
  HelpCircle,
  History,
  Pickaxe,
  Plane,
  Play,
  Radio,
  Send,
  Settings,
  Sparkle,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function App() {
  return (
    <div>
      <div className="bg-neutral-950 text-neutral-50 w-full h-fit h-fit min-h-screen w-screen min-w-screen max-w-screen overflow-visible">
        <div className="relative bg-[radial-gradient(ellipse_at_20%_0%,oklch(0.28_0.09_40/.55),transparent_45%),radial-gradient(ellipse_at_85%_100%,oklch(0.32_0.14_20/.4),transparent_50%),linear-gradient(160deg,#0a0603_0%,#150804_55%,#0a0603_100%)] w-480 h-270 overflow-hidden">
          <div className="pointer-events-none bg-[radial-gradient(circle_at_50%_45%,oklch(0.7_0.15_85/.08),transparent_60%)] absolute inset-0" />
          <div className="pointer-events-none bg-[linear-gradient(oklch(0.85_0.13_85)_1px,transparent_1px),linear-gradient(90deg,oklch(0.85_0.13_85)_1px,transparent_1px)] opacity-6 absolute inset-0" />
          <div className="pointer-events-none top-[12%] left-[18%] size-2 blur-[1px] animate-ping rounded-full bg-[#d4af37] absolute" />
          <div className="pointer-events-none top-[30%] left-[70%] size-1.5 blur-[1px] animate-ping rounded-full bg-[#d4af37] absolute" />
          <div className="pointer-events-none top-[62%] left-[40%] size-1 blur-[1px] animate-ping rounded-full bg-[#c41e3a] absolute" />
          <div className="pointer-events-none top-[78%] left-[85%] size-2 blur-[1px] animate-ping rounded-full bg-[#d4af37] absolute" />
          <div className="pointer-events-none top-[8%] left-[55%] size-1.5 blur-[1px] animate-ping rounded-full bg-[#d4af37] absolute" />
          <header className="relative z-20 bg-[oklch(0.18_0.03_45/.5)] backdrop-blur-xl border-[#d4af37]/25 border-t-0 border-r-0 border-b-1 border-l-0 border-solid flex px-12 justify-between items-center h-24">
            <div className="flex items-center gap-4">
              <div className="relative size-14 bg-[linear-gradient(145deg,#d4af37,#8a6d1e)] shadow-[0_0_25px_oklch(0.75_0.14_85/.5)] rounded-2xl flex justify-center items-center">
                <Pickaxe className="size-7 -rotate-12 text-[#1a0f04]" />
                <div className="size-6 bg-[linear-gradient(145deg,#2ee6a6,#0f8f66)] rotate-12 shadow-[0_0_12px_oklch(0.7_0.17_162/.7)] rounded-lg flex absolute -right-1.5 -bottom-1.5 justify-center items-center">
                  <Gem className="size-3.5 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="leading-none bg-[linear-gradient(90deg,#f5d97a,#d4af37,#f5d97a)] bg-clip-text text-transparent font-black text-2xl leading-8 tracking-tight">
                  Zee9
                </span>
                <span className="leading-none font-semibold text-[#d4af37]/70 text-xs leading-4 tracking-[5.6px] mt-1">
                  MINES
                </span>
              </div>
            </div>
            <nav className="bg-[oklch(0.22_0.02_45/.6)] rounded-full border-[#d4af37]/20 border-1 border-solid flex p-1.5 justify-center items-center gap-2">
              <Button className="bg-[linear-gradient(145deg,#f5d97a,#d4af37)] shadow-[0_0_20px_oklch(0.75_0.14_85/.5)] font-bold rounded-full text-[#1a0f04] px-6 gap-2 h-11">
                <Pickaxe className="size-4" />
                Mines
              </Button>
              <Button
                className="font-semibold rounded-full text-neutral-50/70 px-6 gap-2 h-11"
                variant="ghost"
              >
                <Plane className="size-4" />
                Aviator
              </Button>
              <Button
                className="font-semibold rounded-full text-neutral-50/70 px-6 gap-2 h-11"
                variant="ghost"
              >
                <Crown className="size-4 text-[#d4af37]" />
                Premium
              </Button>
            </nav>
            <div className="flex items-center gap-4">
              <div className="bg-[oklch(0.22_0.02_45/.7)] shadow-[inset_0_0_15px_oklch(0.75_0.14_85/.1)] rounded-full border-[#d4af37]/30 border-1 border-solid flex pl-3 pr-5 items-center gap-3 h-12">
                <div className="relative size-8 bg-[linear-gradient(145deg,#f5d97a,#b8860b)] shadow-[0_0_12px_oklch(0.75_0.14_85/.6)] animate-pulse rounded-full flex justify-center items-center">
                  <Coins className="size-4 text-[#1a0f04]" />
                </div>
                <div className="leading-none flex flex-col">
                  <span className="font-medium text-[#a1a1a1] text-[10px]">
                    Balance
                  </span>
                  <span className="bg-[linear-gradient(90deg,#f5d97a,#d4af37)] bg-clip-text text-transparent font-black text-lg leading-7">
                    PKR 12,480.50
                  </span>
                </div>
              </div>
              <Button
                className="size-11 rounded-full bg-white/5 text-neutral-50/80 border-[#d4af37]/25 border-0 border-solid"
                size="icon"
                variant="outline"
              >
                <History className="size-5" />
              </Button>
              <Button
                className="size-11 rounded-full bg-white/5 text-neutral-50/80 border-[#d4af37]/25 border-0 border-solid"
                size="icon"
                variant="outline"
              >
                <Settings className="size-5" />
              </Button>
            </div>
          </header>
          <div className="relative z-10 grid grid-cols-[360px_1fr_360px] h-[calc(1080px-96px)] px-12 pt-6 gap-6">
            <aside className="bg-[oklch(0.2_0.02_45/.55)] backdrop-blur-xl shadow-[0_0_40px_oklch(0_0_0/.5),inset_0_0_30px_oklch(0.75_0.14_85/.05)] rounded-3xl border-[#d4af37]/30 border-1 border-solid flex p-6 flex-col gap-4">
              <div className="flex items-center gap-2">
                <Wallet className="size-5 text-[#d4af37]" />
                <h2 className="font-bold text-lg leading-7">Place Your Bet</h2>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-medium text-[#a1a1a1] text-xs leading-4">
                  Bet Amount
                </span>
                <div className="bg-[oklch(0.15_0.02_45/.8)] rounded-xl border-[#d4af37]/30 border-1 border-solid flex px-4 items-center gap-2 h-14">
                  <span className="font-bold text-[#d4af37] text-sm leading-5">
                    PKR
                  </span>
                  <input
                    className="bg-transparent outline-none font-bold text-neutral-50 text-xl leading-7 flex-1 w-full"
                    defaultValue="1,000.00"
                  />
                  <div className="flex items-center gap-1">
                    <button className="font-bold rounded-md bg-white/5 text-neutral-50/70 text-xs leading-4 px-2 py-1">
                      ½
                    </button>
                    <button className="font-bold rounded-md bg-white/5 text-neutral-50/70 text-xs leading-4 px-2 py-1">
                      2×
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <button className="font-bold rounded-lg bg-white/5 text-xs leading-4 border-[#d4af37]/15 border-1 border-solid h-9">
                  50
                </button>
                <button className="font-bold rounded-lg bg-white/5 text-xs leading-4 border-[#d4af37]/15 border-1 border-solid h-9">
                  100
                </button>
                <button className="font-bold rounded-lg bg-[#d4af37]/15 text-[#d4af37] text-xs leading-4 border-[#d4af37]/50 border-1 border-solid h-9">
                  500
                </button>
                <button className="font-bold rounded-lg bg-white/5 text-xs leading-4 border-[#d4af37]/15 border-1 border-solid h-9">
                  1K
                </button>
                <button className="font-bold rounded-lg bg-white/5 text-xs leading-4 border-[#d4af37]/15 border-1 border-solid h-9">
                  5K
                </button>
              </div>
              <div className="bg-[#d4af37]/15 h-px" />
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-[#a1a1a1] text-xs leading-4 flex items-center gap-2">
                    <Bomb className="size-4 text-[#c41e3a]" />
                    Mines Count
                  </span>
                  <span className="font-black rounded-md bg-[#c41e3a]/15 text-[#c41e3a] text-sm leading-5 border-[#c41e3a]/30 border-1 border-solid px-3 py-1">
                    5
                  </span>
                </div>
                <div className="relative bg-[oklch(0.15_0.02_45)] rounded-full h-2">
                  <div className="w-[20%] bg-[linear-gradient(90deg,#8a6d1e,#c41e3a)] rounded-full absolute left-0 inset-y-0" />
                  <div className="top-1/2 left-[20%] size-5 -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(145deg,#f5d97a,#d4af37)] shadow-[0_0_12px_oklch(0.75_0.14_85/.6)] rounded-full border-[#1a0f04] border-2 border-solid absolute" />
                </div>
                <div className="grid grid-cols-6 gap-1">
                  <span className="text-center text-[#a1a1a1] text-[10px]">
                    1
                  </span>
                  <span className="text-center text-[#a1a1a1] text-[10px]">
                    3
                  </span>
                  <span className="font-bold text-center text-[#d4af37] text-[10px]">
                    5
                  </span>
                  <span className="text-center text-[#a1a1a1] text-[10px]">
                    10
                  </span>
                  <span className="text-center text-[#a1a1a1] text-[10px]">
                    15
                  </span>
                  <span className="text-center text-[#a1a1a1] text-[10px]">
                    24
                  </span>
                </div>
              </div>
              <div className="bg-[oklch(0.15_0.02_45/.8)] rounded-xl border-[#d4af37]/20 border-1 border-solid flex px-4 justify-between items-center h-14">
                <div className="flex items-center gap-2">
                  <Zap className="size-4 text-[#d4af37]" />
                  <div className="leading-none flex flex-col">
                    <span className="font-semibold text-sm leading-5">
                      Auto Cashout
                    </span>
                    <span className="text-[#a1a1a1] text-[10px]">
                      Target 2.00×
                    </span>
                  </div>
                </div>
                <div className="relative rounded-full bg-[#d4af37]/30 w-11 h-6">
                  <div className="size-5 shadow-[0_0_8px_oklch(0.75_0.14_85/.7)] rounded-full bg-[#d4af37] absolute right-0.5 top-0.5" />
                </div>
              </div>
              <div className="bg-[oklch(0.15_0.02_45/.6)] rounded-2xl border-[#d4af37]/20 border-1 border-solid flex p-4 flex-col gap-2.5">
                <div className="text-sm leading-5 flex justify-between items-center">
                  <span className="text-[#a1a1a1]">Stake</span>
                  <span className="font-bold">PKR 1,000.00</span>
                </div>
                <div className="text-sm leading-5 flex justify-between items-center">
                  <span className="text-[#a1a1a1]">Gems Found</span>
                  <span className="font-bold text-[#2ee6a6]">3 / 20</span>
                </div>
                <div className="text-sm leading-5 flex justify-between items-center">
                  <span className="text-[#a1a1a1]">Multiplier</span>
                  <span className="font-bold text-[#d4af37]">2.47×</span>
                </div>
                <div className="bg-[#d4af37]/15 my-0.5 h-px" />
                <div className="text-sm leading-5 flex justify-between items-center">
                  <span className="text-[#a1a1a1]">Potential Win</span>
                  <span className="bg-[linear-gradient(90deg,#f5d97a,#d4af37)] bg-clip-text text-transparent font-black text-lg leading-7">
                    PKR 2,470
                  </span>
                </div>
              </div>
              <div className="flex mt-auto flex-col gap-3">
                <Button className="bg-[linear-gradient(145deg,#3affb0,#0f9c6e)] shadow-[0_0_30px_oklch(0.7_0.17_162/.6)] relative group font-black rounded-2xl text-[#052e1c] text-lg leading-7 tracking-wide h-16 overflow-hidden">
                  <span className="-translate-x-full transition-transform duration-700 bg-[linear-gradient(90deg,transparent,white/40,transparent)] absolute inset-0" />
                  <HandCoins className="size-6" />
                  CASH OUT · PKR 2,470
                </Button>
                <Button className="bg-[linear-gradient(145deg,#f5d97a,#d4af37)] shadow-[0_0_25px_oklch(0.75_0.14_85/.5)] relative group font-black rounded-2xl text-[#1a0f04] text-base leading-6 tracking-wide h-14 overflow-hidden">
                  <span className="-translate-x-full transition-transform duration-700 bg-[linear-gradient(90deg,transparent,white/50,transparent)] absolute inset-0" />
                  <Play className="size-5" />
                  START GAME
                </Button>
              </div>
            </aside>
            <main className="bg-[oklch(0.16_0.02_45/.45)] backdrop-blur-md shadow-[inset_0_0_60px_oklch(0_0_0/.4)] relative rounded-3xl border-[#d4af37]/25 border-1 border-solid flex p-8 flex-col items-center gap-5 overflow-hidden">
              <div className="pointer-events-none bg-[radial-gradient(ellipse_at_50%_-20%,oklch(0.75_0.14_85/.15),transparent_70%)] absolute inset-x-0 top-0 h-64" />
              <div className="flex flex-col items-center gap-1">
                <h1 className="bg-[linear-gradient(90deg,#f5d97a,#d4af37,#f5d97a)] bg-clip-text text-transparent font-black text-3xl leading-9 tracking-[3.2px]">
                  MINES
                </h1>
                <p className="text-[#a1a1a1] text-sm leading-5">
                  Find the gems, avoid the mines
                </p>
              </div>
              <div className="relative flex flex-col items-center">
                <div className="bg-[radial-gradient(ellipse,oklch(0.75_0.14_85/.25),transparent_70%)] blur-xl animate-pulse rounded-full absolute -inset-x-8 inset-y-0" />
                <span className="relative bg-[linear-gradient(180deg,#fff2c4,#d4af37,#b8860b)] bg-clip-text text-transparent drop-shadow-[0_0_25px_oklch(0.75_0.14_85/.5)] font-black text-7xl leading-18 tracking-tight">
                  2.47×
                </span>
                <span className="relative font-semibold text-[#2ee6a6]/80 text-xs leading-4 tracking-[4.8px] mt-1">
                  RISING
                </span>
              </div>
              <div className="grid grid-cols-5 bg-[oklch(0.12_0.02_45/.5)] shadow-[inset_0_0_40px_oklch(0_0_0/.5)] rounded-3xl border-[#d4af37]/15 border-1 border-solid p-4 gap-3">
                <div className="relative size-[104px] bg-[linear-gradient(145deg,#0f9c6e,#0a5f42)] shadow-[0_0_25px_oklch(0.7_0.17_162/.5)] animate-pulse rounded-2xl border-[#2ee6a6]/50 border-1 border-solid flex justify-center items-center">
                  <Gem className="size-11 drop-shadow-[0_0_10px_oklch(0.9_0.05_162)] text-white" />
                  <Sparkle className="size-4 animate-ping text-white/90 absolute right-2 top-2" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="relative size-[104px] bg-[linear-gradient(145deg,#0f9c6e,#0a5f42)] shadow-[0_0_25px_oklch(0.7_0.17_162/.5)] animate-pulse rounded-2xl border-[#2ee6a6]/50 border-1 border-solid flex justify-center items-center">
                  <Gem className="size-11 drop-shadow-[0_0_10px_oklch(0.9_0.05_162)] text-white" />
                  <Sparkle className="size-4 animate-ping text-white/90 absolute right-2 top-2" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="relative size-[104px] bg-[linear-gradient(145deg,#c41e3a,#7a0f22)] shadow-[0_0_30px_oklch(0.6_0.2_20/.6)] animate-pulse rounded-2xl border-[#c41e3a]/70 border-1 border-solid flex justify-center items-center">
                  <Bomb className="size-11 drop-shadow-[0_0_12px_oklch(0.7_0.2_20)] text-white" />
                  <Flame className="size-5 animate-ping text-[#f5d97a] absolute right-2 -top-1" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="relative size-[104px] bg-[linear-gradient(145deg,#0f9c6e,#0a5f42)] shadow-[0_0_25px_oklch(0.7_0.17_162/.5)] animate-pulse rounded-2xl border-[#2ee6a6]/50 border-1 border-solid flex justify-center items-center">
                  <Gem className="size-11 drop-shadow-[0_0_10px_oklch(0.9_0.05_162)] text-white" />
                  <Sparkle className="size-4 animate-ping text-white/90 absolute right-2 top-2" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
                <div className="size-[104px] bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] transition cursor-pointer rounded-2xl border-[#d4af37]/25 border-1 border-solid flex justify-center items-center">
                  <HelpCircle className="size-9 text-[#d4af37]/30" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-[oklch(0.15_0.02_45/.7)] rounded-xl border-[#2ee6a6]/25 border-1 border-solid flex px-5 items-center gap-2 h-11">
                  <Gem className="size-4 text-[#2ee6a6]" />
                  <span className="font-bold text-sm leading-5">
                    Gems:<span className="text-[#2ee6a6]">3/20</span>
                  </span>
                </div>
                <div className="bg-[oklch(0.15_0.02_45/.7)] rounded-xl border-[#c41e3a]/25 border-1 border-solid flex px-5 items-center gap-2 h-11">
                  <Bomb className="size-4 text-[#c41e3a]" />
                  <span className="font-bold text-sm leading-5">
                    Mines:<span className="text-[#c41e3a]">5</span>
                  </span>
                </div>
                <div className="bg-[oklch(0.15_0.02_45/.7)] rounded-xl border-[#d4af37]/25 border-1 border-solid flex px-5 items-center gap-2 h-11">
                  <TrendingUp className="size-4 text-[#d4af37]" />
                  <span className="font-bold text-sm leading-5">
                    Next:<span className="text-[#d4af37]">1.18×</span>
                  </span>
                </div>
              </div>
            </main>
            <aside className="bg-[oklch(0.2_0.02_45/.55)] backdrop-blur-xl shadow-[0_0_40px_oklch(0_0_0/.5)] rounded-3xl border-[#d4af37]/30 border-1 border-solid flex p-6 flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="size-8 bg-[linear-gradient(145deg,#f5d97a,#b8860b)] shadow-[0_0_12px_oklch(0.75_0.14_85/.5)] rounded-lg flex justify-center items-center">
                    <Trophy className="size-4 text-[#1a0f04]" />
                  </div>
                  <h2 className="font-bold text-lg leading-7">Top Wins</h2>
                </div>
                <div className="rounded-full bg-[#c41e3a]/15 border-[#c41e3a]/30 border-1 border-solid flex px-2.5 py-1 items-center gap-1.5">
                  <span className="size-1.5 animate-pulse rounded-full bg-[#c41e3a]" />
                  <span className="font-bold text-[#c41e3a] text-[10px]">
                    LIVE
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 overflow-hidden">
                <div className="bg-[linear-gradient(90deg,oklch(0.75_0.14_85/.18),transparent)] rounded-2xl border-[#d4af37]/40 border-1 border-solid flex p-2.5 items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      alt="Player"
                      className="size-11 object-cover rounded-full border-[#d4af37] border-2 border-solid"
                      data-authorname="Norbert Tóth"
                      data-authorurl="https://unsplash.com/@tothnorex"
                      data-blurhash="L96a9lW=0#s8bbS3WB$hNGsmxZNb"
                      data-photoid="V77bosLv6xc"
                      src="https://images.unsplash.com/photo-1581966430102-017f269b7a55?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHxwb2tlciUyMHBsYXllciUyMGF2YXRhciUyMHBvcnRyYWl0JTIwZGFya3xlbnwxfDJ8fHwxNzgzMjQ5MDc0fDA&ixlib=rb-4.1.0&q=80&w=400"
                    />
                    <span className="size-5 bg-[linear-gradient(145deg,#f5d97a,#d4af37)] rounded-full border-[#1a0f04] border-1 border-solid flex absolute -right-1 -bottom-1 justify-center items-center">
                      <Crown className="size-3 text-[#1a0f04]" />
                    </span>
                  </div>
                  <div className="leading-tight flex flex-col flex-1">
                    <span className="font-bold text-sm leading-5">
                      Bilal****92
                    </span>
                    <span className="text-[#a1a1a1] text-[10px]">
                      PKR 5,000 · 8.4×
                    </span>
                  </div>
                  <span className="font-black text-[#2ee6a6] text-sm leading-5">
                    +42,000
                  </span>
                </div>
                <div className="rounded-2xl bg-white border-white/10 border-1 border-solid flex p-2.5 items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      alt="Player"
                      className="size-11 object-cover rounded-full border-slate-300 border-2 border-solid"
                      data-authorname="Makeen M.Alaa"
                      data-authorurl="https://unsplash.com/@muhmedelbank"
                      data-blurhash="LHBg3t?vt7~q009FD%D%Rj%M-;M{"
                      data-photoid="YcRKmHUNIeY"
                      src="https://images.unsplash.com/photo-1772839921944-f617bd60e493?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHxtYW4lMjBwb3J0cmFpdCUyMGZhY2UlMjBkYXJrJTIwYmFja2dyb3VuZHxlbnwxfDJ8fHwxNzgzMjQ5MDc0fDA&ixlib=rb-4.1.0&q=80&w=400"
                    />
                    <span className="size-5 font-black rounded-full bg-slate-300 text-[#1a0f04] text-[9px] border-[#1a0f04] border-1 border-solid flex absolute -right-1 -bottom-1 justify-center items-center">
                      2
                    </span>
                  </div>
                  <div className="leading-tight flex flex-col flex-1">
                    <span className="font-bold text-sm leading-5">
                      Ayesha***
                    </span>
                    <span className="text-[#a1a1a1] text-[10px]">
                      PKR 2,500 · 6.1×
                    </span>
                  </div>
                  <span className="font-black text-[#2ee6a6] text-sm leading-5">
                    +15,250
                  </span>
                </div>
                <div className="rounded-2xl bg-white border-white/10 border-1 border-solid flex p-2.5 items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      alt="Player"
                      className="size-11 object-cover rounded-full border-orange-400 border-2 border-solid"
                      data-authorname="Craig Tidball"
                      data-authorurl="https://unsplash.com/@devonshiremedia"
                      data-blurhash="L868EXt700M{t7ayRjfQ00Rj_3xu"
                      data-photoid="n85E2Sz4OLk"
                      src="https://images.unsplash.com/photo-1768247695912-ed8f44d62649?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0JTIwZmFjZSUyMGRhcmslMjBiYWNrZ3JvdW5kfGVufDF8Mnx8fDE3ODMyNDkwNzR8MA&ixlib=rb-4.1.0&q=80&w=400"
                    />
                    <span className="size-5 font-black rounded-full bg-orange-500 text-white text-[9px] border-[#1a0f04] border-1 border-solid flex absolute -right-1 -bottom-1 justify-center items-center">
                      3
                    </span>
                  </div>
                  <div className="leading-tight flex flex-col flex-1">
                    <span className="font-bold text-sm leading-5">
                      Hamza**7
                    </span>
                    <span className="text-[#a1a1a1] text-[10px]">
                      PKR 1,000 · 9.8×
                    </span>
                  </div>
                  <span className="font-black text-[#2ee6a6] text-sm leading-5">
                    +9,800
                  </span>
                </div>
                <div className="rounded-2xl bg-white border-white/5 border-1 border-solid flex p-2.5 items-center gap-3">
                  <img
                    alt="Player"
                    className="size-11 object-cover rounded-full border-white/20 border-1 border-solid"
                    data-authorname="Nicolas Horn"
                    data-authorurl="https://unsplash.com/@sysengineer"
                    data-blurhash="LIH-_c%#u5_N0}?HxtaxVsNGrXM{"
                    data-photoid="ARBQCe2GrjQ"
                    src="https://images.unsplash.com/photo-1625241152315-4a698f74ceb7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjBmYWNlJTIwcG9ydHJhaXQlMjBzbWlsaW5nfGVufDF8Mnx8fDE3ODMyNDkwNzR8MA&ixlib=rb-4.1.0&q=80&w=400"
                  />
                  <div className="leading-tight flex flex-col flex-1">
                    <span className="font-bold text-sm leading-5">
                      Usman**1
                    </span>
                    <span className="text-[#a1a1a1] text-[10px]">
                      PKR 800 · 4.2×
                    </span>
                  </div>
                  <span className="font-black text-[#2ee6a6] text-sm leading-5">
                    +3,360
                  </span>
                </div>
                <div className="rounded-2xl bg-white border-white/5 border-1 border-solid flex p-2.5 items-center gap-3">
                  <div className="size-11 bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] font-bold rounded-full text-sm leading-5 flex justify-center items-center">
                    SK
                  </div>
                  <div className="leading-tight flex flex-col flex-1">
                    <span className="font-bold text-sm leading-5">
                      Sana***k
                    </span>
                    <span className="text-[#a1a1a1] text-[10px]">
                      PKR 500 · 5.5×
                    </span>
                  </div>
                  <span className="font-black text-[#2ee6a6] text-sm leading-5">
                    +2,750
                  </span>
                </div>
                <div className="rounded-2xl bg-white border-white/5 border-1 border-solid flex p-2.5 items-center gap-3">
                  <div className="size-11 bg-[linear-gradient(145deg,#0f9c6e,#0a5f42)] font-bold rounded-full text-sm leading-5 flex justify-center items-center">
                    FA
                  </div>
                  <div className="leading-tight flex flex-col flex-1">
                    <span className="font-bold text-sm leading-5">
                      Faraz**9
                    </span>
                    <span className="text-[#a1a1a1] text-[10px]">
                      PKR 300 · 3.0×
                    </span>
                  </div>
                  <span className="font-black text-[#2ee6a6] text-sm leading-5">
                    +900
                  </span>
                </div>
                <div className="rounded-2xl bg-white border-white/5 border-1 border-solid flex p-2.5 items-center gap-3">
                  <div className="size-11 bg-[linear-gradient(145deg,#c41e3a,#7a0f22)] font-bold rounded-full text-sm leading-5 flex justify-center items-center">
                    ZM
                  </div>
                  <div className="leading-tight flex flex-col flex-1">
                    <span className="font-bold text-sm leading-5">Zain**m</span>
                    <span className="text-[#a1a1a1] text-[10px]">
                      PKR 1,200 · 0.0×
                    </span>
                  </div>
                  <span className="font-black text-[#c41e3a] text-sm leading-5">
                    -1,200
                  </span>
                </div>
                <div className="rounded-2xl bg-white border-white/5 border-1 border-solid flex p-2.5 items-center gap-3">
                  <div className="size-11 bg-[linear-gradient(145deg,#6a1b9a,#4a148c)] font-bold rounded-full text-sm leading-5 flex justify-center items-center">
                    RK
                  </div>
                  <div className="leading-tight flex flex-col flex-1">
                    <span className="font-bold text-sm leading-5">Rida**k</span>
                    <span className="text-[#a1a1a1] text-[10px]">
                      PKR 600 · 2.8×
                    </span>
                  </div>
                  <span className="font-black text-[#2ee6a6] text-sm leading-5">
                    +1,680
                  </span>
                </div>
              </div>
            </aside>
          </div>
          <footer className="relative z-20 grid grid-cols-[1fr_420px] bg-[oklch(0.18_0.03_45/.5)] backdrop-blur-xl border-[#d4af37]/25 border-t-1 border-r-0 border-b-0 border-l-0 border-solid px-12 items-center gap-6 h-24">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="shrink-0 flex items-center gap-2">
                <Radio className="size-4 animate-pulse text-[#c41e3a]" />
                <span className="font-bold text-[#c41e3a] text-xs leading-4 tracking-wider">
                  LIVE WINS
                </span>
              </div>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="shrink-0 bg-[oklch(0.15_0.02_45/.7)] rounded-xl border-[#2ee6a6]/25 border-1 border-solid flex px-3 items-center gap-2 h-12">
                  <Gem className="size-4 text-[#2ee6a6]" />
                  <div className="leading-none flex flex-col">
                    <span className="font-bold text-xs leading-4">
                      Kamran**3
                    </span>
                    <span className="text-[#a1a1a1] text-[10px]">
                      7.2× · PKR 3,600
                    </span>
                  </div>
                  <span className="font-black text-[#2ee6a6] text-xs leading-4">
                    +25,920
                  </span>
                </div>
                <div className="shrink-0 bg-[oklch(0.15_0.02_45/.7)] rounded-xl border-[#d4af37]/25 border-1 border-solid flex px-3 items-center gap-2 h-12">
                  <Coins className="size-4 text-[#d4af37]" />
                  <div className="leading-none flex flex-col">
                    <span className="font-bold text-xs leading-4">Nida**k</span>
                    <span className="text-[#a1a1a1] text-[10px]">
                      3.1× · PKR 1,000
                    </span>
                  </div>
                  <span className="font-black text-[#2ee6a6] text-xs leading-4">
                    +3,100
                  </span>
                </div>
                <div className="shrink-0 bg-[oklch(0.15_0.02_45/.7)] rounded-xl border-[#2ee6a6]/25 border-1 border-solid flex px-3 items-center gap-2 h-12">
                  <Gem className="size-4 text-[#2ee6a6]" />
                  <div className="leading-none flex flex-col">
                    <span className="font-bold text-xs leading-4">Ali***9</span>
                    <span className="text-[#a1a1a1] text-[10px]">
                      12.5× · PKR 500
                    </span>
                  </div>
                  <span className="font-black text-[#2ee6a6] text-xs leading-4">
                    +6,250
                  </span>
                </div>
                <div className="shrink-0 bg-[oklch(0.15_0.02_45/.7)] rounded-xl border-[#d4af37]/25 border-1 border-solid flex px-3 items-center gap-2 h-12">
                  <Coins className="size-4 text-[#d4af37]" />
                  <div className="leading-none flex flex-col">
                    <span className="font-bold text-xs leading-4">Saad**2</span>
                    <span className="text-[#a1a1a1] text-[10px]">
                      2.0× · PKR 2,000
                    </span>
                  </div>
                  <span className="font-black text-[#2ee6a6] text-xs leading-4">
                    +4,000
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 h-14">
              <div className="flex flex-col justify-center flex-1 gap-0.5 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#d4af37] text-[10px]">
                    Hamza:
                  </span>
                  <span className="truncate text-neutral-50/70 text-[10px]">
                    gg nice cashout 🔥
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#2ee6a6] text-[10px]">
                    Ayesha:
                  </span>
                  <span className="truncate text-neutral-50/70 text-[10px]">
                    5 mines is brave
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#c41e3a] text-[10px]">
                    Zain:
                  </span>
                  <span className="truncate text-neutral-50/70 text-[10px]">
                    hit a mine 😭
                  </span>
                </div>
              </div>
              <div className="bg-[oklch(0.15_0.02_45/.8)] rounded-full border-[#d4af37]/25 border-1 border-solid flex px-3 items-center gap-2 w-56 h-11">
                <input
                  className="bg-transparent outline-none text-neutral-50 text-xs leading-4 flex-1 w-full"
                  placeholder="Message..."
                />
                <Button
                  className="size-8 bg-[linear-gradient(145deg,#f5d97a,#d4af37)] rounded-full text-[#1a0f04]"
                  size="icon"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
