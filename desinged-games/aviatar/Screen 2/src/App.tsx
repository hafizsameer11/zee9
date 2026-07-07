import { useEffect } from "react";
import {
  Coins,
  Crown,
  History,
  MessageSquare,
  PartyPopper,
  Pickaxe,
  Plane,
  Rocket,
  Send,
  Settings,
  Sparkles,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function App() {
  return (
    <div>
      <div className="bg-neutral-950 text-neutral-50 w-full h-fit h-fit min-h-screen w-screen min-w-screen max-w-screen overflow-visible">
        <div className="relative bg-[linear-gradient(160deg,#0a0603_0%,#120a04_50%,#1a0f06_100%)] w-480 h-270 overflow-hidden">
          <div className="pointer-events-none bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,oklch(0.769_0.188_70.08/0.22),transparent_70%)] absolute inset-0" />
          <div className="pointer-events-none bg-[conic-gradient(from_180deg,oklch(0.769_0.188_70.08/0.3),oklch(0.645_0.246_16.439/0.22),transparent_70%)] blur-3xl rounded-full absolute right-0 -top-40 w-175 h-150" />
          <div className="pointer-events-none bg-[radial-gradient(ellipse_40%_50%_at_10%_90%,oklch(0.645_0.246_16.439/0.15),transparent_70%)] absolute inset-0" />
          <div className="pointer-events-none absolute inset-0">
            <div className="left-[8%] top-[18%] size-1 shadow-[0_0_8px_2px_rgba(212,175,55,0.6)] bg-[oklch(0.769_0.188_70.08/0.8)] rounded-full absolute" />
            <div className="left-[22%] top-[42%] size-0.5 bg-[oklch(0.769_0.188_70.08/0.6)] rounded-full absolute" />
            <div className="left-[38%] top-[12%] size-1 bg-[oklch(0.769_0.188_70.08/0.5)] rounded-full absolute" />
            <div className="left-[54%] top-[30%] size-0.5 shadow-[0_0_6px_2px_rgba(212,175,55,0.5)] bg-[oklch(0.769_0.188_70.08/0.7)] rounded-full absolute" />
            <div className="left-[70%] top-[16%] size-1 bg-[oklch(0.769_0.188_70.08/0.5)] rounded-full absolute" />
            <div className="left-[84%] top-[38%] size-0.5 bg-[oklch(0.769_0.188_70.08/0.4)] rounded-full absolute" />
            <div className="left-[30%] top-[62%] size-0.5 bg-[oklch(0.769_0.188_70.08/0.4)] rounded-full absolute" />
            <div className="left-[64%] top-[70%] size-1 shadow-[0_0_6px_2px_rgba(212,175,55,0.5)] bg-[oklch(0.769_0.188_70.08/0.6)] rounded-full absolute" />
            <div className="left-[90%] top-[72%] size-0.5 bg-[oklch(0.769_0.188_70.08/0.4)] rounded-full absolute" />
            <div className="left-[14%] top-[80%] size-1 bg-[oklch(0.769_0.188_70.08/0.5)] rounded-full absolute" />
          </div>
          <header className="relative z-20 flex px-12 py-6 justify-between items-center">
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-2">
                <div className="size-11 bg-[linear-gradient(135deg,oklch(0.645_0.246_16.439),oklch(0.769_0.188_70.08))] shadow-[0_0_24px_oklch(0.645_0.246_16.439/0.6)] rounded-xl flex justify-center items-center">
                  <Plane className="size-6 -rotate-45 text-white" />
                </div>
                <span className="bg-[linear-gradient(90deg,oklch(0.645_0.246_16.439),oklch(0.769_0.188_70.08))] bg-clip-text text-transparent font-black text-3xl leading-9 tracking-tight">
                  AVIATOR
                </span>
              </div>
              <nav className="flex items-center gap-2">
                <Button className="shadow-[0_0_20px_oklch(0.769_0.188_70.08/0.5)] bg-[linear-gradient(90deg,oklch(0.769_0.188_70.08),oklch(0.645_0.246_16.439))] text-[oklch(0.21_0.006_285.885)] font-semibold rounded-full px-5 gap-2">
                  <Pickaxe className="size-4" />
                  Mines
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full text-[#a1a1a1] px-5 gap-2"
                >
                  <Plane className="size-4" />
                  Aviator
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full text-[#a1a1a1] px-5 gap-2"
                >
                  <Crown className="size-4" />
                  Premium
                </Button>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="border-[oklch(0.769_0.188_70.08/0.5)] backdrop-blur-md shadow-[0_0_20px_oklch(0.769_0.188_70.08/0.25)] bg-[oklch(0.205_0.01_60/0.6)] rounded-full border-black/1 border-1 border-solid flex px-5 py-2 items-center gap-2">
                <Coins className="size-5 text-[oklch(0.769_0.188_70.08)]" />
                <span className="text-[oklch(0.769_0.188_70.08)] font-bold text-lg leading-7">
                  $12,480.50
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-10 backdrop-blur-md bg-[oklch(0.205_0.01_60/0.6)] border-[oklch(0.769_0.188_70.08/0.25)] rounded-full text-neutral-50 border-black/1 border-1 border-solid"
              >
                <History className="size-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-10 backdrop-blur-md bg-[oklch(0.205_0.01_60/0.6)] border-[oklch(0.769_0.188_70.08/0.25)] rounded-full text-neutral-50 border-black/1 border-1 border-solid"
              >
                <Settings className="size-5" />
              </Button>
              <Avatar className="size-10 ring-2 ring-[oklch(0.769_0.188_70.08/0.5)]">
                <AvatarImage
                  src="https://images.unsplash.com/photo-1740252117012-bb53ad05e370?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHxwbGF5ZXIlMjBhdmF0YXIlMjBwb3J0cmFpdCUyMGRhcmt8ZW58MXwyfHx8MTc4MzIzOTY5N3ww&ixlib=rb-4.1.0&q=80&w=400"
                  alt="Profile"
                  data-photoid="xRMK0ea-Of4"
                  data-authorname="luthfi alfarizi"
                  data-authorurl="https://unsplash.com/@luthfialfarizi"
                  data-blurhash="LYDlNsj]0dWVs|a{RrfREBfR%Fj["
                />
                <AvatarFallback>P</AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="relative z-10 grid grid-cols-[360px_1fr_360px] px-12 pb-6 gap-6">
            <section className="flex flex-col gap-6">
              <Card className="border-[oklch(0.769_0.188_70.08/0.4)] backdrop-blur-xl shadow-[0_0_30px_oklch(0.769_0.188_70.08/0.15)] bg-[oklch(0.205_0.01_60/0.5)] border-black/1 border-1 border-solid p-6 gap-4">
                <CardHeader className="p-0 gap-1">
                  <CardTitle className="text-neutral-50 text-base leading-6 flex items-center gap-2">
                    <span className="size-6 bg-[linear-gradient(135deg,oklch(0.769_0.188_70.08),oklch(0.645_0.246_16.439))] text-[oklch(0.21_0.006_285.885)] font-bold rounded-full text-xs leading-4 flex justify-center items-center">
                      1
                    </span>
                    Bet Slot One
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 gap-4">
                  <div className="bg-[oklch(0.269_0.01_60/0.5)] border-[oklch(0.769_0.188_70.08/0.2)] rounded-xl border-black/1 border-1 border-solid flex px-4 py-3 justify-between items-center">
                    <Input
                      defaultValue="25.00"
                      className="bg-transparent font-bold text-neutral-50 text-2xl leading-8 border-black/1 border-0 border-solid p-0 h-8"
                    />
                    <span className="text-[oklch(0.769_0.188_70.08)] font-semibold text-sm leading-5">
                      USD
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      className="bg-[oklch(0.269_0.01_60/0.4)] border-[oklch(0.769_0.188_70.08/0.2)] rounded-lg text-[#a1a1a1] text-xs leading-4 border-black/1 border-1 border-solid h-8"
                    >
                      +5
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-[oklch(0.269_0.01_60/0.4)] border-[oklch(0.769_0.188_70.08/0.2)] rounded-lg text-[#a1a1a1] text-xs leading-4 border-black/1 border-1 border-solid h-8"
                    >
                      +10
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-[oklch(0.269_0.01_60/0.4)] border-[oklch(0.769_0.188_70.08/0.2)] rounded-lg text-[#a1a1a1] text-xs leading-4 border-black/1 border-1 border-solid h-8"
                    >
                      +50
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-[oklch(0.269_0.01_60/0.4)] border-[oklch(0.769_0.188_70.08/0.2)] rounded-lg text-[#a1a1a1] text-xs leading-4 border-black/1 border-1 border-solid h-8"
                    >
                      MAX
                    </Button>
                  </div>
                  <div className="bg-[oklch(0.269_0.01_60/0.4)] border-[oklch(0.769_0.188_70.08/0.2)] rounded-xl border-black/1 border-1 border-solid flex px-4 py-3 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Zap className="size-4 text-[oklch(0.769_0.188_70.08)]" />
                      <span className="text-neutral-50 text-sm leading-5">
                        Auto Cashout
                      </span>
                    </div>
                    <Switch />
                  </div>
                  <Button className="bg-[linear-gradient(90deg,oklch(0.645_0.246_16.439),oklch(0.769_0.188_70.08))] shadow-[0_0_28px_oklch(0.769_0.188_70.08/0.5)] text-[oklch(0.21_0.006_285.885)] font-bold rounded-xl text-base leading-6 w-full h-14">
                    <Rocket className="size-5 mr-2" />
                    Place Bet · $25.00
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-[oklch(0.769_0.188_70.08/0.4)] backdrop-blur-xl shadow-[0_0_30px_oklch(0.769_0.188_70.08/0.15)] bg-[oklch(0.205_0.01_60/0.5)] border-black/1 border-1 border-solid p-6 gap-4">
                <CardHeader className="p-0 gap-1">
                  <CardTitle className="text-neutral-50 text-base leading-6 flex items-center gap-2">
                    <span className="size-6 bg-[oklch(0.269_0.01_60)] border-[oklch(0.769_0.188_70.08/0.3)] font-bold rounded-full text-neutral-50 text-xs leading-4 border-black/1 border-1 border-solid flex justify-center items-center">
                      2
                    </span>
                    Bet Slot Two
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 gap-4">
                  <div className="bg-[oklch(0.269_0.01_60/0.5)] border-[oklch(0.769_0.188_70.08/0.2)] rounded-xl border-black/1 border-1 border-solid flex px-4 py-3 justify-between items-center">
                    <Input
                      defaultValue="50.00"
                      className="bg-transparent font-bold text-neutral-50 text-2xl leading-8 border-black/1 border-0 border-solid p-0 h-8"
                    />
                    <span className="text-[oklch(0.769_0.188_70.08)] font-semibold text-sm leading-5">
                      USD
                    </span>
                  </div>
                  <div className="bg-[oklch(0.269_0.01_60/0.4)] border-[oklch(0.769_0.188_70.08/0.2)] rounded-xl border-black/1 border-1 border-solid flex px-4 py-3 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Zap className="size-4 text-[oklch(0.769_0.188_70.08)]" />
                      <span className="text-neutral-50 text-sm leading-5">
                        Auto Cashout
                      </span>
                    </div>
                    <Switch defaultChecked={true} />
                  </div>
                  <div className="border-[oklch(0.769_0.188_70.08/0.4)] bg-[oklch(0.269_0.01_60/0.4)] rounded-xl border-black/1 border-1 border-solid flex px-4 py-3 justify-between items-center">
                    <span className="text-[#a1a1a1] text-sm leading-5">
                      Cashout at
                    </span>
                    <span className="text-[oklch(0.769_0.188_70.08)] font-bold text-lg leading-7">
                      2.50x
                    </span>
                  </div>
                  <Button className="bg-[linear-gradient(90deg,oklch(0.704_0.191_22.216),oklch(0.645_0.246_16.439))] shadow-[0_0_28px_oklch(0.645_0.246_16.439/0.5)] font-bold rounded-xl text-white text-base leading-6 w-full h-14">
                    <Rocket className="size-5 mr-2" />
                    Place Bet · $50.00
                  </Button>
                </CardContent>
              </Card>
            </section>
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="backdrop-blur-md bg-[oklch(0.205_0.01_60/0.5)] border-[oklch(0.769_0.188_70.08/0.25)] rounded-full border-black/1 border-1 border-solid flex px-3 py-1.5 items-center gap-2">
                  <span className="bg-[oklch(0.769_0.188_70.08/0.2)] text-[oklch(0.769_0.188_70.08)] font-bold rounded-full text-xs leading-4 px-2 py-0.5">
                    1.24x
                  </span>
                  <span className="bg-[oklch(0.704_0.191_22.216/0.2)] text-[oklch(0.704_0.191_22.216)] font-bold rounded-full text-xs leading-4 px-2 py-0.5">
                    1.02x
                  </span>
                  <span className="bg-[oklch(0.769_0.188_70.08/0.2)] text-[oklch(0.769_0.188_70.08)] font-bold rounded-full text-xs leading-4 px-2 py-0.5">
                    8.51x
                  </span>
                  <span className="bg-[oklch(0.769_0.188_70.08/0.2)] text-[oklch(0.769_0.188_70.08)] font-bold rounded-full text-xs leading-4 px-2 py-0.5">
                    2.17x
                  </span>
                  <span className="bg-[oklch(0.704_0.191_22.216/0.2)] text-[oklch(0.704_0.191_22.216)] font-bold rounded-full text-xs leading-4 px-2 py-0.5">
                    1.11x
                  </span>
                  <span className="bg-[oklch(0.769_0.188_70.08/0.25)] text-[oklch(0.769_0.188_70.08)] font-bold rounded-full text-xs leading-4 px-2 py-0.5">
                    14.60x
                  </span>
                </div>
              </div>
              <Card className="relative border-[oklch(0.769_0.188_70.08/0.5)] bg-[linear-gradient(180deg,#0d0803,#150d05)] shadow-[0_0_50px_oklch(0.769_0.188_70.08/0.25)] border-black/1 border-1 border-solid p-0 flex-1 overflow-hidden">
                <div className="relative w-full h-180 overflow-hidden">
                  <div className="pointer-events-none bg-[linear-gradient(oklch(0.769_0.188_70.08/0.07)_1px,transparent_1px),linear-gradient(90deg,oklch(0.769_0.188_70.08/0.07)_1px,transparent_1px)] absolute inset-0" />
                  <div className="pointer-events-none bg-[radial-gradient(ellipse_50%_60%_at_30%_80%,oklch(0.645_0.246_16.439/0.2),transparent_70%)] absolute inset-0" />
                  <div className="pointer-events-none left-[24%] top-[70%] size-1.5 shadow-[0_0_8px_2px_oklch(0.704_0.191_22.216/0.7)] bg-[oklch(0.704_0.191_22.216)] rounded-full absolute" />
                  <div className="pointer-events-none left-[40%] top-[55%] size-1.5 shadow-[0_0_8px_2px_oklch(0.704_0.191_22.216/0.7)] bg-[oklch(0.704_0.191_22.216)] rounded-full absolute" />
                  <div className="pointer-events-none left-[58%] top-[40%] size-1.5 shadow-[0_0_8px_2px_oklch(0.704_0.191_22.216/0.7)] bg-[oklch(0.704_0.191_22.216)] rounded-full absolute" />
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 1000 720"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient
                        id="curveStroke"
                        x1="0"
                        y1="1"
                        x2="1"
                        y2="0"
                      >
                        <stop
                          offset="0%"
                          stopColor="oklch(0.704 0.191 22.216)"
                        />
                        <stop
                          offset="100%"
                          stopColor="oklch(0.769 0.188 70.08)"
                        />
                      </linearGradient>
                      <linearGradient
                        id="curveFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="oklch(0.769 0.188 70.08 / 0.35)"
                        />
                        <stop
                          offset="100%"
                          stopColor="oklch(0.769 0.188 70.08 / 0)"
                        />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,720 C250,700 520,540 720,300 C800,205 850,150 880,120 L880,720 Z"
                      fill="url(#curveFill)"
                    />
                    <path
                      d="M0,720 C250,700 520,540 720,300 C800,205 850,150 880,120"
                      fill="none"
                      stroke="url(#curveStroke)"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="left-[80%] top-[9%] -translate-y-1/2 flex absolute items-center">
                    <div className="-translate-x-14 bg-[linear-gradient(90deg,transparent,oklch(0.704_0.191_22.216),oklch(0.769_0.188_70.08))] blur-[2px] rounded-full w-16 h-1.5" />
                    <div className="size-14 bg-[radial-gradient(circle,white,oklch(0.769_0.188_70.08))] shadow-[0_0_30px_10px_oklch(0.769_0.188_70.08/0.7)] rounded-full flex justify-center items-center">
                      <Plane className="size-7 text-[oklch(0.21_0.006_285.885)] -rotate-45" />
                    </div>
                  </div>
                  <div className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex absolute flex-col items-center">
                    <span className="text-[oklch(0.769_0.188_70.08)] font-black text-8xl leading-24">
                      3.24x
                    </span>
                    <span className="font-medium uppercase text-[#a1a1a1] text-sm leading-5 tracking-[4.8px] mt-2">
                      Flying High
                    </span>
                  </div>
                  <div className="text-[#a1a1a1] text-xs leading-4 flex absolute inset-x-0 bottom-0 px-8 py-4 justify-between">
                    <span>0s</span>
                    <span>2s</span>
                    <span>4s</span>
                    <span>6s</span>
                    <span>8s</span>
                  </div>
                </div>
              </Card>
            </section>
            <section className="flex flex-col gap-6">
              <Card className="border-[oklch(0.769_0.188_70.08/0.4)] backdrop-blur-xl shadow-[0_0_30px_oklch(0.769_0.188_70.08/0.15)] bg-[oklch(0.205_0.01_60/0.5)] border-black/1 border-1 border-solid p-6 gap-4">
                <CardHeader className="p-0 flex-row justify-between items-center gap-2">
                  <CardTitle className="text-neutral-50 text-base leading-6 flex items-center gap-2">
                    <Trophy className="size-4 text-[oklch(0.769_0.188_70.08)]" />
                    Live Leaderboard
                  </CardTitle>
                  <span className="bg-[oklch(0.696_0.17_162.48/0.15)] text-[oklch(0.696_0.17_162.48)] font-medium rounded-full text-xs leading-4 flex px-2 py-0.5 items-center gap-1">
                    <span className="size-1.5 bg-[oklch(0.696_0.17_162.48)] rounded-full" />
                    2,481
                  </span>
                </CardHeader>
                <CardContent className="max-h-[560px] overflow-y-auto p-0 gap-2">
                  <div className="border-[oklch(0.769_0.188_70.08/0.4)] bg-[oklch(0.269_0.01_60/0.4)] rounded-xl border-black/1 border-1 border-solid flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-9">
                        <AvatarImage
                          src="https://images.unsplash.com/photo-1740252117012-bb53ad05e370?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHxwbGF5ZXIlMjBhdmF0YXIlMjBwb3J0cmFpdCUyMGRhcmt8ZW58MXwyfHx8MTc4MzIzOTY5N3ww&ixlib=rb-4.1.0&q=80&w=400"
                          alt="Player"
                          data-photoid="xRMK0ea-Of4"
                          data-authorname="luthfi alfarizi"
                          data-authorurl="https://unsplash.com/@luthfialfarizi"
                          data-blurhash="LYDlNsj]0dWVs|a{RrfREBfR%Fj["
                        />
                        <AvatarFallback>N</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-neutral-50 text-sm leading-5">
                          NeonKing
                        </span>
                        <span className="text-[#a1a1a1] text-xs leading-4">
                          $500.00
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[oklch(0.696_0.17_162.48)] font-bold text-sm leading-5">
                        8.51x
                      </span>
                      <span className="text-[oklch(0.769_0.188_70.08)] font-medium text-xs leading-4">
                        +$4,255
                      </span>
                    </div>
                  </div>
                  <div className="bg-[oklch(0.269_0.01_60/0.3)] rounded-xl flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-[oklch(0.769_0.188_70.08/0.3)] text-neutral-50 text-xs leading-4">
                          LX
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-neutral-50 text-sm leading-5">
                          LuckyX
                        </span>
                        <span className="text-[#a1a1a1] text-xs leading-4">
                          $120.00
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[oklch(0.696_0.17_162.48)] font-bold text-sm leading-5">
                        3.24x
                      </span>
                      <span className="text-[oklch(0.769_0.188_70.08)] font-medium text-xs leading-4">
                        +$388
                      </span>
                    </div>
                  </div>
                  <div className="bg-[oklch(0.269_0.01_60/0.3)] rounded-xl flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-[oklch(0.645_0.246_16.439/0.3)] text-neutral-50 text-xs leading-4">
                          VP
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-neutral-50 text-sm leading-5">
                          VioletPro
                        </span>
                        <span className="text-[#a1a1a1] text-xs leading-4">
                          $75.00
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-[#a1a1a1] text-sm leading-5">
                        Flying...
                      </span>
                      <span className="text-[#a1a1a1] text-xs leading-4">
                        --
                      </span>
                    </div>
                  </div>
                  <div className="bg-[oklch(0.269_0.01_60/0.3)] rounded-xl flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-[oklch(0.269_0.01_60)] text-neutral-50 text-xs leading-4">
                          SG
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-neutral-50 text-sm leading-5">
                          StarGazer
                        </span>
                        <span className="text-[#a1a1a1] text-xs leading-4">
                          $300.00
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[oklch(0.704_0.191_22.216)] font-bold text-sm leading-5">
                        1.02x
                      </span>
                      <span className="text-[oklch(0.704_0.191_22.216)] font-medium text-xs leading-4">
                        -$300
                      </span>
                    </div>
                  </div>
                  <div className="bg-[oklch(0.269_0.01_60/0.3)] rounded-xl flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-[oklch(0.769_0.188_70.08/0.3)] text-neutral-50 text-xs leading-4">
                          MG
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-neutral-50 text-sm leading-5">
                          MagnetGuru
                        </span>
                        <span className="text-[#a1a1a1] text-xs leading-4">
                          $45.00
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[oklch(0.696_0.17_162.48)] font-bold text-sm leading-5">
                        2.17x
                      </span>
                      <span className="text-[oklch(0.769_0.188_70.08)] font-medium text-xs leading-4">
                        +$97
                      </span>
                    </div>
                  </div>
                  <div className="bg-[oklch(0.269_0.01_60/0.3)] rounded-xl flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-[oklch(0.645_0.246_16.439/0.3)] text-neutral-50 text-xs leading-4">
                          CR
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-neutral-50 text-sm leading-5">
                          CrimsonRun
                        </span>
                        <span className="text-[#a1a1a1] text-xs leading-4">
                          $210.00
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[oklch(0.696_0.17_162.48)] font-bold text-sm leading-5">
                        5.60x
                      </span>
                      <span className="text-[oklch(0.769_0.188_70.08)] font-medium text-xs leading-4">
                        +$1,176
                      </span>
                    </div>
                  </div>
                  <div className="bg-[oklch(0.269_0.01_60/0.3)] rounded-xl flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-[oklch(0.269_0.01_60)] text-neutral-50 text-xs leading-4">
                          AZ
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-neutral-50 text-sm leading-5">
                          AzureBet
                        </span>
                        <span className="text-[#a1a1a1] text-xs leading-4">
                          $60.00
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[oklch(0.704_0.191_22.216)] font-bold text-sm leading-5">
                        1.11x
                      </span>
                      <span className="text-[oklch(0.704_0.191_22.216)] font-medium text-xs leading-4">
                        -$60
                      </span>
                    </div>
                  </div>
                  <div className="bg-[oklch(0.269_0.01_60/0.3)] rounded-xl flex p-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-[oklch(0.769_0.188_70.08/0.3)] text-neutral-50 text-xs leading-4">
                          GH
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-neutral-50 text-sm leading-5">
                          GhostHawk
                        </span>
                        <span className="text-[#a1a1a1] text-xs leading-4">
                          $500.00
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[oklch(0.696_0.17_162.48)] font-bold text-sm leading-5">
                        1.85x
                      </span>
                      <span className="text-[oklch(0.769_0.188_70.08)] font-medium text-xs leading-4">
                        +$425
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </main>
          <footer className="relative z-20 backdrop-blur-xl bg-[oklch(0.205_0.01_60/0.5)] border-[oklch(0.769_0.188_70.08/0.25)] rounded-2xl border-black/1 border-1 border-solid flex mx-12 mb-6 px-6 py-3 items-center gap-4">
            <div className="text-[#a1a1a1] text-sm leading-5 flex items-center gap-2">
              <MessageSquare className="size-4 text-[oklch(0.769_0.188_70.08)]" />
              Live Activity
            </div>
            <div className="flex items-center flex-1 gap-3 overflow-hidden">
              <div className="border-[oklch(0.769_0.188_70.08/0.4)] bg-[oklch(0.769_0.188_70.08/0.1)] shadow-[0_0_16px_oklch(0.769_0.188_70.08/0.25)] rounded-full border-black/1 border-1 border-solid flex px-4 py-1.5 items-center gap-2">
                <PartyPopper className="size-4 text-[oklch(0.769_0.188_70.08)]" />
                <span className="text-neutral-50 text-sm leading-5">
                  <span className="text-[oklch(0.769_0.188_70.08)] font-bold">
                    CrimsonRun
                  </span>
                  cashed out at
                  <span className="text-[oklch(0.696_0.17_162.48)] font-bold">
                    5.60x
                  </span>
                  for
                  <span className="text-[oklch(0.769_0.188_70.08)] font-bold">
                    $1,176
                  </span>
                </span>
              </div>
              <div className="border-[oklch(0.645_0.246_16.439/0.4)] bg-[oklch(0.645_0.246_16.439/0.1)] rounded-full border-black/1 border-1 border-solid flex px-4 py-1.5 items-center gap-2">
                <Sparkles className="size-4 text-[oklch(0.769_0.188_70.08)]" />
                <span className="text-neutral-50 text-sm leading-5">
                  <span className="font-bold text-neutral-50">NeonKing</span>won
                  <span className="text-[oklch(0.769_0.188_70.08)] font-bold">
                    $4,255
                  </span>
                  at
                  <span className="text-[oklch(0.696_0.17_162.48)] font-bold">
                    8.51x
                  </span>
                </span>
              </div>
              <div className="bg-[oklch(0.269_0.01_60/0.4)] border-[oklch(0.769_0.188_70.08/0.2)] rounded-full border-black/1 border-1 border-solid flex px-4 py-1.5 items-center gap-2">
                <TrendingUp className="size-4 text-[oklch(0.696_0.17_162.48)]" />
                <span className="text-neutral-50 text-sm leading-5">
                  <span className="font-bold text-neutral-50">MagnetGuru</span>
                  cashed out at
                  <span className="text-[oklch(0.696_0.17_162.48)] font-bold">
                    2.17x
                  </span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Say something..."
                className="bg-[oklch(0.269_0.01_60/0.5)] border-[oklch(0.769_0.188_70.08/0.2)] rounded-full text-neutral-50 text-sm leading-5 border-black/1 border-1 border-solid w-56 h-9"
              />
              <Button
                size="icon"
                className="size-9 shadow-[0_0_16px_oklch(0.769_0.188_70.08/0.5)] bg-[linear-gradient(135deg,oklch(0.769_0.188_70.08),oklch(0.645_0.246_16.439))] text-[oklch(0.21_0.006_285.885)] rounded-full"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
