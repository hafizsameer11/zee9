import { useEffect } from "react";
import {
  BookOpen,
  CircleDollarSign,
  Coins,
  Crown,
  Diamond,
  Eye,
  EyeOff,
  Gem,
  Heart,
  History,
  MessageCircle,
  Pickaxe,
  Plane,
  Send,
  Settings,
  Smile,
  Spade,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function App() {
  return (
    <div>
      <div className="bg-neutral-950 text-neutral-50 w-full h-fit h-fit min-h-screen w-screen min-w-screen max-w-screen overflow-visible">
        <div className="bg-[#0a0603] text-neutral-50 w-full h-fit overflow-hidden">
          <div className="relative flex mx-auto flex-col w-480 h-[887px]">
            <div className="pointer-events-none bg-[#d4af37]/12 absolute inset-0" />
            <header className="relative z-20 border-[#d4af37]/15 border-t-0 border-r-0 border-b-1 border-l-0 border-solid flex px-12 py-4 justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="relative size-12 bg-[linear-gradient(145deg,#3a2a08,#1a1206)] shadow-[0_0_20px_rgba(212,175,55,0.25)] rounded-2xl border-[#d4af37]/40 border-1 border-solid flex justify-center items-center">
                  <Pickaxe className="size-6 text-[#d4af37]" />
                  <span className="size-5 bg-[linear-gradient(145deg,#1bd6a0,#0e8f6a)] shadow-[0_0_10px_rgba(27,214,160,0.6)] rounded-full flex absolute -right-1 -bottom-1 justify-center items-center">
                    <Gem className="size-3 text-white" />
                  </span>
                </div>
                <div className="leading-none flex flex-col">
                  <span className="font-extrabold text-[#d4af37] text-2xl leading-8 tracking-tight">
                    Zee9
                  </span>
                  <span className="font-semibold text-[#a1a1a1] text-[11px] tracking-[5.6px]">
                    TEEN PATTI
                  </span>
                </div>
              </div>
              <nav className="backdrop-blur-md rounded-full bg-neutral-900/60 border-[#d4af37]/15 border-1 border-solid flex p-1.5 items-center gap-2">
                <button className="transition-colors font-medium rounded-full text-[#a1a1a1] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                  <Pickaxe className="size-4" />
                  Mines
                </button>
                <button className="transition-colors font-medium rounded-full text-[#a1a1a1] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                  <Plane className="size-4" />
                  Aviator
                </button>
                <button className="bg-[linear-gradient(145deg,#f5d76e,#d4af37)] shadow-[0_0_18px_rgba(212,175,55,0.5)] font-semibold rounded-full text-[#1a1206] text-sm leading-5 flex px-5 py-2 items-center gap-2">
                  <Spade className="size-4" />
                  Teen Patti
                </button>
                <button className="transition-colors font-medium rounded-full text-[#a1a1a1] text-sm leading-5 flex px-4 py-2 items-center gap-2">
                  <Crown className="size-4" />
                  Premium
                </button>
              </nav>
              <div className="flex items-center gap-3">
                <div className="bg-[linear-gradient(145deg,#2a1e06,#160f04)] shadow-[0_0_18px_rgba(212,175,55,0.2)] rounded-full border-[#d4af37]/40 border-1 border-solid flex pl-3 pr-5 py-2 items-center gap-3">
                  <span className="size-8 bg-[linear-gradient(145deg,#f5d76e,#d4af37)] shadow-inner rounded-full flex justify-center items-center">
                    <Coins className="size-4 text-[#1a1206]" />
                  </span>
                  <div className="leading-none flex flex-col">
                    <span className="uppercase text-[#a1a1a1] text-[10px] tracking-wider">
                      Balance
                    </span>
                    <span className="font-bold text-[#d4af37] text-base leading-6">
                      PKR 12,480.50
                    </span>
                  </div>
                </div>
                <button className="size-10 transition-colors rounded-full bg-neutral-900/60 text-[#a1a1a1] border-[#d4af37]/15 border-1 border-solid flex justify-center items-center">
                  <History className="size-5" />
                </button>
                <button className="size-10 transition-colors rounded-full bg-neutral-900/60 text-[#a1a1a1] border-[#d4af37]/15 border-1 border-solid flex justify-center items-center">
                  <Settings className="size-5" />
                </button>
              </div>
            </header>
            <div className="relative z-10 min-h-0 flex px-8 py-6 flex-1 gap-6">
              <aside className="shrink-0 flex flex-col w-62.5">
                <Card className="backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-neutral-900/50 border-[#d4af37]/25 border-0 border-solid p-4 flex-1 gap-4">
                  <CardHeader className="p-0 gap-1">
                    <CardTitle className="text-[#d4af37] text-base leading-6 flex items-center gap-2">
                      <BookOpen className="size-4" />
                      Hand Rankings
                    </CardTitle>
                    <p className="text-[#a1a1a1] text-[11px]">
                      Strongest to weakest
                    </p>
                  </CardHeader>
                  <CardContent className="flex p-0 flex-col gap-2">
                    <div className="rounded-xl bg-[#d4af37]/12 border-[#d4af37]/40 border-1 border-solid flex p-2 items-center gap-3">
                      <div className="flex gap-0.5">
                        <span className="shadow font-bold rounded-sm bg-white text-[#c41e3a] text-[11px] flex justify-center items-center w-6 h-8">
                          A♦
                        </span>
                        <span className="shadow font-bold rounded-sm bg-white text-[#c41e3a] text-[11px] flex justify-center items-center w-6 h-8">
                          A♥
                        </span>
                        <span className="shadow font-bold rounded-sm bg-white text-black text-[11px] flex justify-center items-center w-6 h-8">
                          A♣
                        </span>
                      </div>
                      <div className="leading-tight flex flex-col">
                        <span className="font-bold text-[#d4af37] text-xs leading-4">
                          Trail
                        </span>
                        <span className="text-[#a1a1a1] text-[10px]">
                          Three of a kind
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-neutral-800/40 border-white/10 border-1 border-solid flex p-2 items-center gap-3">
                      <div className="flex gap-0.5">
                        <span className="shadow font-bold rounded-sm bg-white text-black text-[11px] flex justify-center items-center w-6 h-8">
                          5♠
                        </span>
                        <span className="shadow font-bold rounded-sm bg-white text-black text-[11px] flex justify-center items-center w-6 h-8">
                          6♠
                        </span>
                        <span className="shadow font-bold rounded-sm bg-white text-black text-[11px] flex justify-center items-center w-6 h-8">
                          7♠
                        </span>
                      </div>
                      <div className="leading-tight flex flex-col">
                        <span className="font-bold text-neutral-50 text-xs leading-4">
                          Pure Seq
                        </span>
                        <span className="text-[#a1a1a1] text-[10px]">
                          Straight flush
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-neutral-800/40 border-white/10 border-1 border-solid flex p-2 items-center gap-3">
                      <div className="flex gap-0.5">
                        <span className="shadow font-bold rounded-sm bg-white text-[#c41e3a] text-[11px] flex justify-center items-center w-6 h-8">
                          8♥
                        </span>
                        <span className="shadow font-bold rounded-sm bg-white text-black text-[11px] flex justify-center items-center w-6 h-8">
                          9♣
                        </span>
                        <span className="shadow font-bold rounded-sm bg-white text-black text-[11px] flex justify-center items-center w-6 h-8">
                          T♠
                        </span>
                      </div>
                      <div className="leading-tight flex flex-col">
                        <span className="font-bold text-neutral-50 text-xs leading-4">
                          Sequence
                        </span>
                        <span className="text-[#a1a1a1] text-[10px]">
                          Straight
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-neutral-800/40 border-white/10 border-1 border-solid flex p-2 items-center gap-3">
                      <div className="flex gap-0.5">
                        <span className="shadow font-bold rounded-sm bg-white text-[#c41e3a] text-[11px] flex justify-center items-center w-6 h-8">
                          2♦
                        </span>
                        <span className="shadow font-bold rounded-sm bg-white text-[#c41e3a] text-[11px] flex justify-center items-center w-6 h-8">
                          7♦
                        </span>
                        <span className="shadow font-bold rounded-sm bg-white text-[#c41e3a] text-[11px] flex justify-center items-center w-6 h-8">
                          J♦
                        </span>
                      </div>
                      <div className="leading-tight flex flex-col">
                        <span className="font-bold text-neutral-50 text-xs leading-4">
                          Color
                        </span>
                        <span className="text-[#a1a1a1] text-[10px]">
                          Flush
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-neutral-800/40 border-white/10 border-1 border-solid flex p-2 items-center gap-3">
                      <div className="flex gap-0.5">
                        <span className="shadow font-bold rounded-sm bg-white text-black text-[11px] flex justify-center items-center w-6 h-8">
                          K♣
                        </span>
                        <span className="shadow font-bold rounded-sm bg-white text-[#c41e3a] text-[11px] flex justify-center items-center w-6 h-8">
                          K♥
                        </span>
                        <span className="shadow font-bold rounded-sm bg-white text-black text-[11px] flex justify-center items-center w-6 h-8">
                          4♠
                        </span>
                      </div>
                      <div className="leading-tight flex flex-col">
                        <span className="font-bold text-neutral-50 text-xs leading-4">
                          Pair
                        </span>
                        <span className="text-[#a1a1a1] text-[10px]">
                          Two of a kind
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-neutral-800/40 border-white/10 border-1 border-solid flex p-2 items-center gap-3">
                      <div className="flex gap-0.5">
                        <span className="shadow font-bold rounded-sm bg-white text-[#c41e3a] text-[11px] flex justify-center items-center w-6 h-8">
                          A♥
                        </span>
                        <span className="shadow font-bold rounded-sm bg-white text-black text-[11px] flex justify-center items-center w-6 h-8">
                          9♠
                        </span>
                        <span className="shadow font-bold rounded-sm bg-white text-[#c41e3a] text-[11px] flex justify-center items-center w-6 h-8">
                          3♦
                        </span>
                      </div>
                      <div className="leading-tight flex flex-col">
                        <span className="font-bold text-neutral-50 text-xs leading-4">
                          High Card
                        </span>
                        <span className="text-[#a1a1a1] text-[10px]">
                          No combination
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </aside>
              <main className="min-w-0 flex flex-col flex-1 gap-4">
                <div className="flex px-2 justify-between items-center">
                  <div className="flex flex-col">
                    <h1 className="font-extrabold text-[#d4af37] text-2xl leading-8 tracking-tight">
                      TEEN PATTI
                    </h1>
                    <p className="text-[#a1a1a1] text-xs leading-4">
                      Bet blind or seen, build the strongest hand
                    </p>
                  </div>
                  <div className="rounded-full bg-[#c41e3a]/15 border-[#c41e3a]/40 border-1 border-solid flex px-3 py-1.5 items-center gap-2">
                    <span className="size-2 animate-pulse rounded-full bg-[#c41e3a]" />
                    <span className="font-semibold text-[#c41e3a] text-xs leading-4">
                      LIVE TABLE
                    </span>
                  </div>
                </div>
                <div className="relative min-h-0 backdrop-blur-md shadow-[0_0_40px_rgba(0,0,0,0.6)] rounded-3xl bg-neutral-900/40 border-[#d4af37]/25 border-1 border-solid flex-1 overflow-hidden">
                  <div className="pointer-events-none bg-[#d4af37] absolute inset-0" />
                  <div className="bg-[radial-gradient(ellipse_at_center,#16663f,#0c3d26_70%,#082418)] shadow-[inset_0_0_80px_rgba(0,0,0,0.6),0_0_40px_rgba(212,175,55,0.2)] rounded-[999px] border-[#d4af37]/60 border-6 border-solid absolute inset-8">
                    <div className="pointer-events-none rounded-[999px] border-[#d4af37]/20 border-1 border-solid absolute inset-4" />
                    <div className="pointer-events-none rounded-[999px] bg-white/10 absolute inset-0" />
                  </div>
                  <div className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex absolute flex-col items-center gap-2">
                    <div className="rounded-full bg-black/40 border-[#d4af37]/40 border-1 border-solid flex px-3 py-1 items-center gap-1">
                      <Coins className="size-3.5 text-[#d4af37]" />
                      <span className="font-semibold text-[#d4af37] text-[11px]">
                        Boot 100 PKR
                      </span>
                    </div>
                    <div className="relative flex justify-center items-center">
                      <span className="size-24 blur-xl rounded-full bg-[#d4af37]/25 absolute" />
                      <div className="relative flex flex-col items-center gap-1.5">
                        <div className="-space-x-3 flex">
                          <span className="size-9 bg-[linear-gradient(145deg,#f5d76e,#c41e3a)] shadow-[0_4px_8px_rgba(0,0,0,0.4)] rounded-full border-white/70 border-2 border-solid" />
                          <span className="size-9 bg-[linear-gradient(145deg,#4facfe,#00369e)] shadow-[0_4px_8px_rgba(0,0,0,0.4)] rounded-full border-white/70 border-2 border-solid" />
                          <span className="size-9 bg-[linear-gradient(145deg,#f5d76e,#d4af37)] shadow-[0_4px_8px_rgba(0,0,0,0.4)] rounded-full border-white/70 border-2 border-solid" />
                          <span className="size-9 bg-[linear-gradient(145deg,#1bd6a0,#0e8f6a)] shadow-[0_4px_8px_rgba(0,0,0,0.4)] rounded-full border-white/70 border-2 border-solid" />
                        </div>
                        <span className="uppercase text-white/70 text-[10px] tracking-[4.8px]">
                          Total Pot
                        </span>
                        <span className="drop-shadow-[0_0_14px_rgba(212,175,55,0.6)] font-extrabold text-[#d4af37] text-4xl leading-10">
                          PKR 2,400
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="left-1/2 -translate-x-1/2 flex absolute top-6 flex-col items-center gap-1.5">
                    <div className="relative">
                      <span className="ring-2 ring-[#d4af37]/50 animate-pulse rounded-full absolute -inset-1" />
                      <img
                        src="https://images.unsplash.com/photo-1732888878731-7e52999af144?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjB3b21hbiUyMHBvcnRyYWl0JTIwZmFjZSUyMHNtaWxpbmd8ZW58MXwyfHx8MTc4MzI2NDAwNHww&ixlib=rb-4.1.0&q=80&w=400"
                        alt="Simran"
                        className="relative size-14 object-cover rounded-full border-[#d4af37] border-2 border-solid"
                        data-photoid="-2uwItf15Bg"
                        data-authorname="rakesh kumar"
                        data-authorurl="https://unsplash.com/@solarmonkey123"
                        data-blurhash="L9AAUJ-;4n00j[M{ofRj9ZM{WB%M"
                      />
                    </div>
                    <span className="font-semibold text-neutral-50 text-xs leading-4">
                      Simran
                    </span>
                    <div className="flex gap-0.5">
                      <span className="bg-[linear-gradient(145deg,#7a1226,#c41e3a)] shadow rounded-sm border-[#d4af37]/50 border-1 border-solid w-6 h-8" />
                      <span className="bg-[linear-gradient(145deg,#7a1226,#c41e3a)] shadow rounded-sm border-[#d4af37]/50 border-1 border-solid -ml-2 w-6 h-8" />
                      <span className="bg-[linear-gradient(145deg,#7a1226,#c41e3a)] shadow rounded-sm border-[#d4af37]/50 border-1 border-solid -ml-2 w-6 h-8" />
                    </div>
                    <span className="font-bold rounded-full bg-[#d4af37]/20 text-[#d4af37] text-[10px] border-[#d4af37]/50 border-1 border-solid flex px-2 py-0.5 items-center gap-1">
                      <Timer className="size-3" />
                      TURN · 15s
                    </span>
                  </div>
                  <div className="top-1/2 -translate-y-1/2 flex absolute left-6 flex-col items-center gap-1.5">
                    <img
                      src="https://images.unsplash.com/photo-1629708494720-91f2c75f7604?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBtYW4lMjBwb3J0cmFpdCUyMGZhY2V8ZW58MXwyfHx8MTc4MzI0MTk5NHww&ixlib=rb-4.1.0&q=80&w=400"
                      alt="Raja"
                      className="size-14 object-cover rounded-full border-white/10 border-2 border-solid"
                      data-photoid="MmSYKyYe0-w"
                      data-authorname="Potters Media"
                      data-authorurl="https://unsplash.com/@pottersmedia"
                      data-blurhash="LdKx9zj[~qt7~qWBRjfQRjWBM{of"
                    />
                    <span className="font-semibold text-neutral-50 text-xs leading-4">
                      Raja
                    </span>
                    <div className="flex gap-0.5">
                      <span className="bg-[linear-gradient(145deg,#7a1226,#c41e3a)] shadow rounded-sm border-[#d4af37]/50 border-1 border-solid w-6 h-8" />
                      <span className="bg-[linear-gradient(145deg,#7a1226,#c41e3a)] shadow rounded-sm border-[#d4af37]/50 border-1 border-solid -ml-2 w-6 h-8" />
                      <span className="bg-[linear-gradient(145deg,#7a1226,#c41e3a)] shadow rounded-sm border-[#d4af37]/50 border-1 border-solid -ml-2 w-6 h-8" />
                    </div>
                    <span className="font-semibold rounded-full bg-neutral-800 text-[#a1a1a1] text-[10px] border-white/10 border-1 border-solid px-2 py-0.5">
                      SEEN · 400
                    </span>
                  </div>
                  <div className="top-1/2 -translate-y-1/2 flex absolute right-6 flex-col items-center gap-1.5">
                    <img
                      src="https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMG1hbiUyMHBvcnRyYWl0JTIwaGVhZHNob3R8ZW58MXwyfHx8MTc4MzI2NDAwNHww&ixlib=rb-4.1.0&q=80&w=400"
                      alt="Arjun"
                      className="size-14 object-cover grayscale opacity-70 rounded-full border-white/10 border-2 border-solid"
                      data-photoid="n4KewLKFOZw"
                      data-authorname="Imansyah Muhamad Putera"
                      data-authorurl="https://unsplash.com/@imansyahmp"
                      data-blurhash="LOE{FM_NK6r=kqt7$*WXE2RjwvWV"
                    />
                    <span className="font-semibold text-[#a1a1a1] text-xs leading-4">
                      Arjun
                    </span>
                    <div className="opacity-50 flex gap-0.5">
                      <span className="rounded-sm bg-neutral-800 border-white/10 border-1 border-solid w-6 h-8" />
                      <span className="rounded-sm bg-neutral-800 border-white/10 border-1 border-solid -ml-2 w-6 h-8" />
                      <span className="rounded-sm bg-neutral-800 border-white/10 border-1 border-solid -ml-2 w-6 h-8" />
                    </div>
                    <span className="font-bold rounded-full bg-[#c41e3a]/20 text-[#c41e3a] text-[10px] border-[#c41e3a]/40 border-1 border-solid px-2 py-0.5">
                      PACKED
                    </span>
                  </div>
                  <div className="left-1/2 -translate-x-1/2 flex absolute bottom-6 flex-col items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="shadow-[0_6px_14px_rgba(0,0,0,0.5)] rounded-md bg-white text-[#c41e3a] border-[#d4af37]/60 border-1 border-solid flex p-1 flex-col justify-between items-center w-11 h-16">
                        <span className="font-bold text-sm leading-5 self-start">
                          Q
                        </span>
                        <Heart className="size-4 fill-[#c41e3a]" />
                        <span className="rotate-180 font-bold text-sm leading-5 self-end">
                          Q
                        </span>
                      </span>
                      <span className="shadow-[0_6px_14px_rgba(0,0,0,0.5)] rounded-md bg-white text-[#c41e3a] border-[#d4af37]/60 border-1 border-solid flex p-1 flex-col justify-between items-center w-11 h-16">
                        <span className="font-bold text-sm leading-5 self-start">
                          Q
                        </span>
                        <Diamond className="size-4 fill-[#c41e3a]" />
                        <span className="rotate-180 font-bold text-sm leading-5 self-end">
                          Q
                        </span>
                      </span>
                      <span className="shadow-[0_6px_14px_rgba(0,0,0,0.5)] rounded-md bg-white text-black border-[#d4af37]/60 border-1 border-solid flex p-1 flex-col justify-between items-center w-11 h-16">
                        <span className="font-bold text-sm leading-5 self-start">
                          7
                        </span>
                        <Spade className="size-4 fill-black" />
                        <span className="rotate-180 font-bold text-sm leading-5 self-end">
                          7
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img
                        src="https://images.unsplash.com/photo-1616840420121-7ad8ed885f11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0JTIwYmVhdXR5JTIwZmFjZSUyMGRhcmt8ZW58MXwyfHx8MTc4MzI2NDAwNHww&ixlib=rb-4.1.0&q=80&w=400"
                        alt="You"
                        className="size-14 object-cover shadow-[0_0_16px_rgba(212,175,55,0.5)] rounded-full border-[#d4af37] border-2 border-solid"
                        data-photoid="zrZUCPgKMHc"
                        data-authorname="Khashayar Kouchpeydeh"
                        data-authorurl="https://unsplash.com/@kouchpeydeh"
                        data-blurhash="L55OZ?%N00DiWBWBj[t7D%Rix]xv"
                      />
                      <div className="leading-tight flex flex-col">
                        <span className="font-bold text-[#d4af37] text-sm leading-5">
                          YOU
                        </span>
                        <span className="font-semibold text-[#1bd6a0] text-[11px]">
                          PAIR (Q)
                        </span>
                        <span className="font-bold rounded-full bg-[#1bd6a0]/15 text-[#1bd6a0] text-[10px] border-[#1bd6a0]/40 border-1 border-solid flex px-2 py-0.5 items-center gap-1">
                          SEEN
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="backdrop-blur-md rounded-2xl bg-neutral-900/50 border-[#d4af37]/25 border-1 border-solid flex p-3 justify-between items-center">
                  <div className="text-sm leading-5 flex items-center gap-4">
                    <span className="text-[#a1a1a1]">
                      Chaal:
                      <span className="font-bold text-[#d4af37]">PKR 200</span>
                    </span>
                    <span className="bg-white/10 w-px h-4" />
                    <span className="text-[#a1a1a1]">
                      Blind:
                      <span className="font-bold text-neutral-50">PKR 100</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="transition-colors font-semibold rounded-xl bg-neutral-800/60 text-neutral-50 text-sm leading-5 border-white/10 border-1 border-solid flex px-5 py-2.5 items-center gap-2">
                      <EyeOff className="size-4" />
                      BLIND
                    </button>
                    <button className="bg-[linear-gradient(145deg,#f5d76e,#d4af37)] shadow-[0_0_18px_rgba(212,175,55,0.5)] transition font-bold rounded-xl text-[#1a1206] text-sm leading-5 flex px-6 py-2.5 items-center gap-2">
                      <CircleDollarSign className="size-4" />
                      CHAAL 200
                    </button>
                    <button className="transition-colors font-semibold rounded-xl bg-neutral-800/60 text-[#d4af37] text-sm leading-5 border-[#d4af37]/40 border-1 border-solid flex px-5 py-2.5 items-center gap-2">
                      <Eye className="size-4" />
                      SEE
                    </button>
                    <button className="bg-[linear-gradient(145deg,#1bd6a0,#0e8f6a)] shadow-[0_0_18px_rgba(27,214,160,0.4)] transition font-bold rounded-xl text-white text-sm leading-5 flex px-5 py-2.5 items-center gap-2">
                      <Swords className="size-4" />
                      SHOW
                    </button>
                    <button className="transition-colors font-semibold rounded-xl bg-[#c41e3a]/15 text-[#c41e3a] text-sm leading-5 border-[#c41e3a]/50 border-1 border-solid flex px-5 py-2.5 items-center gap-2">
                      <XCircle className="size-4" />
                      PACK
                    </button>
                  </div>
                </div>
              </main>
              <aside className="shrink-0 flex flex-col gap-4 w-62.5">
                <Card className="backdrop-blur-md bg-neutral-900/50 border-[#d4af37]/25 border-0 border-solid p-4 gap-3">
                  <CardHeader className="p-0 gap-0">
                    <CardTitle className="text-[#d4af37] text-base leading-6 flex items-center gap-2">
                      <Trophy className="size-4" />
                      Round Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex p-0 flex-col gap-2">
                    <div className="rounded-xl bg-[#d4af37]/12 border-[#d4af37]/40 border-1 border-solid flex p-3 justify-between items-center">
                      <span className="text-[#a1a1a1] text-xs leading-4">
                        Current Pot
                      </span>
                      <span className="font-extrabold text-[#d4af37] text-lg leading-7">
                        PKR 2,400
                      </span>
                    </div>
                    <div className="rounded-xl bg-neutral-800/40 border-white/10 border-1 border-solid flex p-2.5 justify-between items-center">
                      <span className="text-[#a1a1a1] text-xs leading-4">
                        Boot
                      </span>
                      <span className="font-bold text-neutral-50 text-sm leading-5">
                        PKR 100
                      </span>
                    </div>
                    <div className="rounded-xl bg-neutral-800/40 border-white/10 border-1 border-solid flex p-2.5 justify-between items-center">
                      <span className="text-[#a1a1a1] text-xs leading-4">
                        Players
                      </span>
                      <span className="font-bold text-neutral-50 text-sm leading-5">
                        3 / 4
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#1bd6a0]/10 border-[#1bd6a0]/30 border-1 border-solid flex p-2.5 justify-between items-center">
                      <span className="text-[#a1a1a1] text-xs leading-4">
                        Your Hand
                      </span>
                      <span className="font-bold text-[#1bd6a0] text-sm leading-5">
                        PAIR (Q)
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="min-h-0 backdrop-blur-md bg-neutral-900/50 border-[#d4af37]/25 border-0 border-solid p-4 flex-1 gap-3">
                  <CardHeader className="p-0 gap-0">
                    <CardTitle className="text-neutral-50 text-sm leading-5 flex items-center gap-2">
                      <MessageCircle className="size-4 text-[#d4af37]" />
                      Table Chat
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex p-0 flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <span className="size-6 bg-[linear-gradient(145deg,#4facfe,#00369e)] font-bold rounded-full text-white text-[10px] flex mt-0.5 justify-center items-center">
                        R
                      </span>
                      <div className="rounded-xl bg-neutral-800/60 text-neutral-50 text-[11px] px-2.5 py-1.5">
                        Nice cards Raja 🔥
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="size-6 bg-[linear-gradient(145deg,#f5d76e,#c41e3a)] font-bold rounded-full text-white text-[10px] flex mt-0.5 justify-center items-center">
                        S
                      </span>
                      <div className="rounded-xl bg-neutral-800/60 text-neutral-50 text-[11px] px-2.5 py-1.5">
                        I'm going blind this time
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="size-6 bg-[linear-gradient(145deg,#f5d76e,#d4af37)] font-bold rounded-full text-[#1a1206] text-[10px] flex mt-0.5 justify-center items-center">
                        Y
                      </span>
                      <div className="rounded-xl bg-[#d4af37]/20 text-neutral-50 text-[11px] border-[#d4af37]/30 border-1 border-solid px-2.5 py-1.5">
                        Let's raise the pot 💰
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
            <footer className="relative z-10 border-[#d4af37]/15 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex px-8 py-3 items-center gap-6">
              <div className="flex items-center flex-1 gap-3 overflow-hidden">
                <span className="shrink-0 font-bold rounded-full bg-[#c41e3a]/15 text-[#c41e3a] text-[11px] border-[#c41e3a]/40 border-1 border-solid flex px-2.5 py-1 items-center gap-1.5">
                  <span className="size-1.5 animate-pulse rounded-full bg-[#c41e3a]" />
                  LIVE WINS
                </span>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-neutral-900/60 border-[#d4af37]/20 border-1 border-solid flex px-3 py-1.5 items-center gap-2">
                    <Coins className="size-3.5 text-[#d4af37]" />
                    <span className="text-neutral-50 text-xs leading-4">
                      Bilal****92 won
                      <span className="font-bold text-[#1bd6a0]">
                        PKR 42,000
                      </span>
                      · Trail
                    </span>
                  </div>
                  <div className="rounded-full bg-neutral-900/60 border-[#d4af37]/20 border-1 border-solid flex px-3 py-1.5 items-center gap-2">
                    <Gem className="size-3.5 text-[#1bd6a0]" />
                    <span className="text-neutral-50 text-xs leading-4">
                      Simran won
                      <span className="font-bold text-[#1bd6a0]">
                        PKR 15,250
                      </span>
                      · Pure Seq
                    </span>
                  </div>
                  <div className="rounded-full bg-neutral-900/60 border-[#d4af37]/20 border-1 border-solid flex px-3 py-1.5 items-center gap-2">
                    <Coins className="size-3.5 text-[#d4af37]" />
                    <span className="text-neutral-50 text-xs leading-4">
                      Arjun won
                      <span className="font-bold text-[#1bd6a0]">
                        PKR 9,800
                      </span>
                      · Color
                    </span>
                  </div>
                  <div className="rounded-full bg-neutral-900/60 border-[#d4af37]/20 border-1 border-solid flex px-3 py-1.5 items-center gap-2">
                    <Sparkles className="size-3.5 text-[#d4af37]" />
                    <span className="text-neutral-50 text-xs leading-4">
                      Neha won
                      <span className="font-bold text-[#1bd6a0]">
                        PKR 3,360
                      </span>
                      · Pair
                    </span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2 w-105">
                <div className="rounded-full bg-neutral-900/60 border-[#d4af37]/20 border-1 border-solid flex px-4 py-2 items-center flex-1 gap-2">
                  <Smile className="size-4 text-[#a1a1a1]" />
                  <input
                    className="bg-transparent outline-none text-neutral-50 text-sm leading-5 flex-1"
                    placeholder="Type a message..."
                  />
                </div>
                <button className="size-10 bg-[linear-gradient(145deg,#f5d76e,#d4af37)] shadow-[0_0_14px_rgba(212,175,55,0.5)] transition rounded-full text-[#1a1206] flex justify-center items-center">
                  <Send className="size-4" />
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
