import { getDesignCanvasStyle, type DesignLayout } from '../hooks/useDesignScale'
import type { RefObject } from 'react'
import {
  BookOpen,
  CircleDollarSign,
  Coins,
  Diamond,
  Eye,
  EyeOff,
  Gem,
  Heart,
  History,
  MessageCircle,
  Pickaxe,
  Send,
  Settings,
  Smile,
  Spade,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  XCircle,
} from 'lucide-react'
import {
  SEAT_META,
  activeCount,
  activeSeats,
  blindAmount,
  chaalAmount,
  evaluateHand,
  type Card,
  type PlayerId,
  type TeenPattiState,
} from '../engines/teenPatti'
import { HAND_RANK_GUIDE, LIVE_WINS, TEEN_PATTI_AVATARS } from './teenPattiAssets'
import './teenPatti.tw.css'

const CHAT = [
  { who: 'R', color: 'linear-gradient(145deg,#4facfe,#00369e)', text: 'Nice cards Raja 🔥' },
  { who: 'S', color: 'linear-gradient(145deg,#f5d76e,#c41e3a)', text: "I'm going blind this time" },
  { who: 'Y', color: 'linear-gradient(145deg,#f5d76e,#d4af37)', text: "Let's raise the pot 💰", you: true },
]

const SEAT_ORDER: PlayerId[] = ['bot2', 'bot1', 'bot3', 'you']

function formatPkr(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatHandDisplay(hand: { rank: string; label: string }, cards: Card[]): string {
  if (hand.rank === 'pair' && cards.length >= 2) {
    const ranks = cards.map((c) => c.rank)
    for (const r of ranks) {
      if (ranks.filter((x) => x === r).length >= 2) return `PAIR (${r})`
    }
  }
  if (hand.rank === 'trail') return 'TRAIL'
  if (hand.rank === 'pure') return 'PURE SEQ'
  if (hand.rank === 'sequence') return 'SEQUENCE'
  if (hand.rank === 'color') return 'COLOR'
  if (hand.rank === 'pair') return 'PAIR'
  return hand.label.toUpperCase()
}

function isRedSuit(suit: string) {
  return suit === '♥' || suit === '♦'
}

function FaceCard({ card }: { card: Card }) {
  const color = isRedSuit(card.suit) ? 'text-[#c41e3a]' : 'text-black'
  return (
    <span
      className={`shadow-[0_6px_14px_rgba(0,0,0,0.5)] rounded-md bg-white border-[#d4af37]/60 border border-solid flex p-1 flex-col justify-between items-center w-11 h-16 ${color}`}
    >
      <span className="font-bold text-sm leading-5 self-start">{card.rank}</span>
      {card.suit === '♥' && <Heart className="size-4 fill-[#c41e3a]" />}
      {card.suit === '♦' && <Diamond className="size-4 fill-[#c41e3a]" />}
      {card.suit === '♠' && <Spade className="size-4 fill-black" />}
      {card.suit === '♣' && <Spade className="size-4 fill-black" />}
      <span className="rotate-180 font-bold text-sm leading-5 self-end">{card.rank}</span>
    </span>
  )
}

function CardBackMini({ dim }: { dim?: boolean }) {
  if (dim) {
    return (
      <>
        <span className="rounded-sm bg-neutral-800 border-white/10 border border-solid w-6 h-8" />
        <span className="rounded-sm bg-neutral-800 border-white/10 border border-solid -ml-2 w-6 h-8" />
        <span className="rounded-sm bg-neutral-800 border-white/10 border border-solid -ml-2 w-6 h-8" />
      </>
    )
  }
  return (
    <>
      <span className="bg-[linear-gradient(145deg,#7a1226,#c41e3a)] shadow rounded-sm border-[#d4af37]/50 border border-solid w-6 h-8" />
      <span className="bg-[linear-gradient(145deg,#7a1226,#c41e3a)] shadow rounded-sm border-[#d4af37]/50 border border-solid -ml-2 w-6 h-8" />
      <span className="bg-[linear-gradient(145deg,#7a1226,#c41e3a)] shadow rounded-sm border-[#d4af37]/50 border border-solid -ml-2 w-6 h-8" />
    </>
  )
}

function shouldShowSeatCards(seat: { id: PlayerId; seen: boolean; packed: boolean }, isYou: boolean, game: TeenPattiState): boolean {
  const { phase, showResult } = game
  if (isYou) {
    return seat.seen || showResult != null || (phase === 'ended' && game.winnerId === seat.id)
  }
  if (seat.packed) return false
  if (showResult && (phase === 'showdown' || phase === 'ended')) {
    if (seat.id === showResult.winner) return true
    const active = activeSeats(game)
    return active.some((s) => s.id === seat.id && s.id !== showResult.winner)
  }
  return false
}

function MiniRankCard({ label }: { label: string }) {
  const rank = label.slice(0, -1)
  const suit = label.slice(-1)
  const red = suit === '♥' || suit === '♦'
  return (
    <span
      className={`shadow font-bold rounded-sm bg-white text-[11px] flex justify-center items-center w-6 h-8 ${red ? 'text-[#c41e3a]' : 'text-black'}`}
    >
      {rank}
      {suit}
    </span>
  )
}

export type TeenPattiDesignUIProps = {
  viewportRef: RefObject<HTMLDivElement | null>
  layout: DesignLayout
  designW: number
  designH: number
  balance: number
  boot: number
  game: TeenPattiState | null
  timer: number
  isYourTurn: boolean
  canShow: boolean
  onHome: () => void
  onJoin: () => void
  onBlind: () => void
  onSee: () => void
  onChaal: () => void
  onShow: () => void
  onPack: () => void
  onReset: () => void
  canvasClassName: string
  rootClassName: string
}

export default function TeenPattiDesignUI({
  viewportRef,
  layout,
  designW,
  designH,
  balance,
  boot,
  game,
  timer,
  isYourTurn,
  canShow,
  onHome,
  onJoin,
  onBlind,
  onSee,
  onChaal,
  onShow,
  onPack,
  onReset,
  canvasClassName,
  rootClassName,
}: TeenPattiDesignUIProps) {
  const phase = game?.phase ?? 'idle'
  const playing = phase === 'playing'
  const inRound = game != null && (phase === 'playing' || phase === 'showdown')
  const atTable = game != null && phase !== 'idle'
  const youSeat = game?.seats.find((s) => s.id === 'you')
  const youHand = youSeat?.cards.length ? evaluateHand(youSeat.cards) : null
  const pot = game?.pot ?? boot
  const chaal = game ? chaalAmount(game, youSeat?.seen ?? false) : boot * 2
  const blind = game ? blindAmount(game) : boot

  const seatPosClass = (id: PlayerId) => {
    if (id === 'bot2') return 'left-1/2 -translate-x-1/2 top-6'
    if (id === 'bot1') return 'top-1/2 -translate-y-1/2 left-6'
    if (id === 'bot3') return 'top-1/2 -translate-y-1/2 right-6'
    return 'left-1/2 -translate-x-1/2 bottom-6'
  }

  const renderSeat = (id: PlayerId) => {
    const meta = SEAT_META[id]
    const isYou = id === 'you'
    const seat = game?.seats.find((s) => s.id === id)
    const isTurn = playing && game && game.seats[game.turnIndex]?.id === id
    const showCards = seat && game ? shouldShowSeatCards(seat, isYou, game) : false
    const hand = showCards && seat?.cards.length ? evaluateHand(seat.cards) : null
    const packed = seat?.packed ?? false

    if (isYou) {
      const handLabel = hand && showCards ? formatHandDisplay(hand, seat!.cards) : null
      return (
        <div key={id} className={`flex absolute flex-col items-center gap-2 ${seatPosClass(id)}`}>
          <div className="flex gap-1.5">
            {showCards && seat
              ? seat.cards.map((c, i) => <FaceCard key={i} card={c} />)
              : [0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="bg-[linear-gradient(145deg,#7a1226,#c41e3a)] shadow rounded-sm border-[#d4af37]/50 border border-solid w-6 h-8"
                  />
                ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              {isTurn && (
                <span className="ring-2 ring-[#d4af37]/50 animate-pulse rounded-full absolute -inset-1" />
              )}
              <img
                src={TEEN_PATTI_AVATARS[id]}
                alt={meta.name}
                className="relative size-14 object-cover shadow-[0_0_16px_rgba(212,175,55,0.5)] rounded-full border-[#d4af37] border-2 border-solid"
              />
            </div>
            <div className="leading-tight flex flex-col">
              <span className="font-bold text-[#d4af37] text-sm leading-5">YOU</span>
              {handLabel && (
                <span className="font-semibold text-[#1bd6a0] text-[11px]">{handLabel}</span>
              )}
              {seat?.seen && !packed && (
                <span className="font-bold rounded-full bg-[#1bd6a0]/15 text-[#1bd6a0] text-[10px] border-[#1bd6a0]/40 border border-solid flex px-2 py-0.5 items-center gap-1">
                  SEEN
                </span>
              )}
              {!seat?.seen && playing && !packed && (
                <span className="font-semibold rounded-full bg-neutral-800 text-[#a1a1a1] text-[10px] border-white/10 border border-solid px-2 py-0.5">
                  BLIND
                </span>
              )}
              {packed && (
                <span className="font-bold rounded-full bg-[#c41e3a]/20 text-[#c41e3a] text-[10px] border-[#c41e3a]/40 border border-solid px-2 py-0.5">
                  PACKED
                </span>
              )}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div
        key={id}
        className={`flex absolute flex-col items-center gap-1.5 ${seatPosClass(id)} ${packed ? 'opacity-70' : ''}`}
      >
        <div className="relative">
          {isTurn && (
            <span className="ring-2 ring-[#d4af37]/50 animate-pulse rounded-full absolute -inset-1" />
          )}
          <img
            src={TEEN_PATTI_AVATARS[id]}
            alt={meta.name}
            className={`relative size-14 object-cover rounded-full border-2 border-solid ${
              isTurn ? 'border-[#d4af37]' : 'border-white/10'
            } ${packed ? 'grayscale' : ''}`}
          />
        </div>
        <span className={`font-semibold text-xs leading-4 ${packed ? 'text-[#a1a1a1]' : 'text-neutral-50'}`}>
          {meta.name}
        </span>
        <div className={`flex gap-0.5 ${packed ? 'opacity-50' : ''}`}>
          {showCards && seat
            ? seat.cards.map((c, i) => <FaceCard key={i} card={c} />)
            : <CardBackMini dim={packed} />}
        </div>
        {isTurn && playing && (
          <span className="font-bold rounded-full bg-[#d4af37]/20 text-[#d4af37] text-[10px] border-[#d4af37]/50 border border-solid flex px-2 py-0.5 items-center gap-1">
            <Timer className="size-3" />
            TURN · {timer}s
          </span>
        )}
        {!packed && seat?.seen && !isTurn && (
          <span className="font-semibold rounded-full bg-neutral-800 text-[#a1a1a1] text-[10px] border-white/10 border border-solid px-2 py-0.5">
            SEEN · {seat.betThisRound}
          </span>
        )}
        {!packed && !seat?.seen && playing && !isTurn && (
          <span className="font-semibold rounded-full bg-neutral-800 text-[#a1a1a1] text-[10px] border-white/10 border border-solid px-2 py-0.5">
            BLIND
          </span>
        )}
        {packed && (
          <span className="font-bold rounded-full bg-[#c41e3a]/20 text-[#c41e3a] text-[10px] border-[#c41e3a]/40 border border-solid px-2 py-0.5">
            PACKED
          </span>
        )}
        {hand && showCards && !packed && (
          <span className="font-semibold text-[#1bd6a0] text-[11px]">
            {formatHandDisplay(hand, seat!.cards)}
          </span>
        )}
      </div>
    )
  }

  const renderIdleSeat = (id: PlayerId) => {
    const meta = SEAT_META[id]
    const isYou = id === 'you'
    return (
      <div key={id} className={`flex absolute flex-col items-center gap-1.5 ${seatPosClass(id)}`}>
        <img
          src={TEEN_PATTI_AVATARS[id]}
          alt={meta.name}
          className={`size-14 object-cover rounded-full border-2 border-solid ${
            isYou ? 'border-[#d4af37] shadow-[0_0_16px_rgba(212,175,55,0.5)]' : 'border-white/10'
          }`}
        />
        <span className="font-semibold text-neutral-50 text-xs leading-4">
          {isYou ? 'YOU' : meta.name}
        </span>
      </div>
    )
  }

  return (
    <div className={rootClassName} ref={viewportRef}>
      <div
        className={canvasClassName}
        style={getDesignCanvasStyle(layout, designW, designH)}
      >
        <div className="game-ui relative flex flex-col w-full h-full bg-[#0a0603] text-neutral-50 overflow-hidden">
          <div className="pointer-events-none bg-[#d4af37]/12 absolute inset-0" />

          <header className="relative z-20 border-[#d4af37]/15 border-b border-solid flex px-12 py-4 justify-between items-center shrink-0">
            <button type="button" className="flex items-center gap-4 border-0 bg-transparent p-0 cursor-pointer" onClick={onHome}>
              <div className="relative size-12 bg-[linear-gradient(145deg,#3a2a08,#1a1206)] shadow-[0_0_20px_rgba(212,175,55,0.25)] rounded-2xl border-[#d4af37]/40 border border-solid flex justify-center items-center">
                <Pickaxe className="size-6 text-[#d4af37]" />
                <span className="size-5 bg-[linear-gradient(145deg,#1bd6a0,#0e8f6a)] shadow-[0_0_10px_rgba(27,214,160,0.6)] rounded-full flex absolute -right-1 -bottom-1 justify-center items-center">
                  <Gem className="size-3 text-white" />
                </span>
              </div>
              <div className="leading-none flex flex-col text-left">
                <span className="font-extrabold text-[#d4af37] text-2xl leading-8 tracking-tight">Zee9</span>
                <span className="font-semibold text-[#a1a1a1] text-[11px] tracking-[5.6px]">TEEN PATTI</span>
              </div>
            </button>

            <div className="flex items-center gap-3">
              <div className="bg-[linear-gradient(145deg,#2a1e06,#160f04)] shadow-[0_0_18px_rgba(212,175,55,0.2)] rounded-full border-[#d4af37]/40 border border-solid flex pl-3 pr-5 py-2 items-center gap-3">
                <span className="size-8 bg-[linear-gradient(145deg,#f5d76e,#d4af37)] shadow-inner rounded-full flex justify-center items-center">
                  <Coins className="size-4 text-[#1a1206]" />
                </span>
                <div className="leading-none flex flex-col">
                  <span className="uppercase text-[#a1a1a1] text-[10px] tracking-wider">Balance</span>
                  <span className="font-bold text-[#d4af37] text-base leading-6">PKR {formatPkr(balance)}</span>
                </div>
              </div>
              <button type="button" className="size-10 rounded-full bg-neutral-900/60 text-[#a1a1a1] border-[#d4af37]/15 border border-solid flex justify-center items-center cursor-pointer">
                <History className="size-5" />
              </button>
              <button type="button" className="size-10 rounded-full bg-neutral-900/60 text-[#a1a1a1] border-[#d4af37]/15 border border-solid flex justify-center items-center cursor-pointer">
                <Settings className="size-5" />
              </button>
            </div>
          </header>

          <div className="game-body relative z-10 min-h-0 flex flex-1">
            <aside className="game-sidebar shrink-0 flex flex-col min-h-0">
              <div className="game-panel backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-neutral-900/50 border-[#d4af37]/25 border border-solid flex-1 flex flex-col gap-3 min-h-0 overflow-hidden rounded-xl">
                <div className="p-0 gap-1">
                  <div className="text-[#d4af37] text-base leading-6 flex items-center gap-2 font-semibold">
                    <BookOpen className="size-4" />
                    Hand Rankings
                  </div>
                  <p className="text-[#a1a1a1] text-[11px]">Strongest to weakest</p>
                </div>
                <div className="flex p-0 flex-col gap-2 overflow-y-auto min-h-0">
                  {HAND_RANK_GUIDE.map((row) => (
                    <div
                      key={row.name}
                      className={`rounded-xl border border-solid flex p-2 items-center gap-3 ${
                        row.highlight
                          ? 'bg-[#d4af37]/12 border-[#d4af37]/40'
                          : 'bg-neutral-800/40 border-white/10'
                      }`}
                    >
                      <div className="flex gap-0.5">
                        {row.cards.map((c) => (
                          <MiniRankCard key={c} label={c} />
                        ))}
                      </div>
                      <div className="leading-tight flex flex-col">
                        <span className={`font-bold text-xs leading-4 ${row.highlight ? 'text-[#d4af37]' : 'text-neutral-50'}`}>
                          {row.name}
                        </span>
                        <span className="text-[#a1a1a1] text-[10px]">{row.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <main className="game-main min-w-0 flex flex-col flex-1 min-h-0">
              <div className="flex px-2 justify-between items-center shrink-0">
                <div className="flex flex-col">
                  <h1 className="font-extrabold text-[#d4af37] text-2xl leading-8 tracking-tight">TEEN PATTI</h1>
                  <p className="text-[#a1a1a1] text-xs leading-4">Bet blind or seen, build the strongest hand</p>
                </div>
                {inRound && (
                  <div className="rounded-full bg-[#c41e3a]/15 border-[#c41e3a]/40 border border-solid flex px-3 py-1.5 items-center gap-2">
                    <span className="size-2 animate-pulse rounded-full bg-[#c41e3a]" />
                    <span className="font-semibold text-[#c41e3a] text-xs leading-4">LIVE TABLE</span>
                  </div>
                )}
              </div>

              <div className="relative min-h-0 backdrop-blur-md shadow-[0_0_40px_rgba(0,0,0,0.6)] rounded-3xl bg-neutral-900/40 border-[#d4af37]/25 border border-solid flex-1 overflow-hidden">
                <div className="pointer-events-none bg-[#d4af37]/12 absolute inset-0" />
                <div className="bg-[radial-gradient(ellipse_at_center,#16663f,#0c3d26_70%,#082418)] shadow-[inset_0_0_80px_rgba(0,0,0,0.6),0_0_40px_rgba(212,175,55,0.2)] rounded-[999px] border-[#d4af37]/60 border-[6px] border-solid absolute inset-8 pointer-events-none">
                  <div className="pointer-events-none rounded-[999px] border-[#d4af37]/20 border border-solid absolute inset-4" />
                  <div className="pointer-events-none rounded-[999px] bg-white/10 absolute inset-0" />
                </div>

                {atTable ? (
                  <>
                    <div className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex absolute flex-col items-center gap-2 z-[2]">
                      <div className="rounded-full bg-black/40 border-[#d4af37]/40 border border-solid flex px-3 py-1 items-center gap-1">
                        <Coins className="size-3.5 text-[#d4af37]" />
                        <span className="font-semibold text-[#d4af37] text-[11px]">Boot {game!.boot} PKR</span>
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
                          <span className="uppercase text-white/70 text-[10px] tracking-[4.8px]">Total Pot</span>
                          <span className="drop-shadow-[0_0_14px_rgba(212,175,55,0.6)] font-extrabold text-[#d4af37] text-4xl leading-10">
                            PKR {formatPkr(pot)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {SEAT_ORDER.map(renderSeat)}
                    {game?.showResult && phase === 'showdown' && (
                      <div className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute z-20 px-6 py-3 rounded-xl bg-black/75 border border-[#d4af37]/50 text-[#d4af37] font-bold text-center">
                        {SEAT_META[game.showResult.winner].name} wins — {game.showResult.hand.label}
                      </div>
                    )}
                    {phase === 'ended' && game?.winnerId && (
                      <div className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute z-20 px-6 py-3 rounded-xl bg-black/80 border border-[#d4af37]/50 text-center">
                        <div className="font-extrabold text-[#d4af37] text-lg">
                          {game.winnerId === 'you' ? 'You won!' : `${SEAT_META[game.winnerId].name} wins`}
                        </div>
                        {game.showResult && (
                          <div className="text-[#1bd6a0] text-sm mt-1">{game.showResult.hand.label}</div>
                        )}
                        <div className="text-white/70 text-xs mt-1">Pot: PKR {formatPkr(game.pot)}</div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {SEAT_ORDER.map(renderIdleSeat)}
                    <div className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex absolute flex-col items-center gap-3 z-[4] text-center">
                      <p className="text-[#a1a1a1] text-sm">3 cards · Blind · Chaal · Show</p>
                      <button
                        type="button"
                        onClick={onJoin}
                        className="px-7 py-3 rounded-xl bg-[linear-gradient(145deg,#f5d76e,#d4af37)] shadow-[0_0_24px_rgba(212,175,55,0.5)] text-[#1a1206] font-extrabold text-sm cursor-pointer border-0"
                      >
                        Join Table · Boot {boot} PKR
                      </button>
                    </div>
                  </>
                )}
              </div>

              {playing && (
                <div className="backdrop-blur-md rounded-2xl bg-neutral-900/50 border-[#d4af37]/25 border border-solid flex p-3 justify-between items-center shrink-0">
                  <div className="text-sm leading-5 flex items-center gap-4">
                    <span className="text-[#a1a1a1]">
                      Chaal: <span className="font-bold text-[#d4af37]">PKR {chaal}</span>
                    </span>
                    <span className="bg-white/10 w-px h-4" />
                    <span className="text-[#a1a1a1]">
                      Blind: <span className="font-bold text-neutral-50">PKR {blind}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onBlind}
                      disabled={!isYourTurn || !!youSeat?.seen}
                      className="font-semibold rounded-xl bg-neutral-800/60 text-neutral-50 text-sm leading-5 border-white/10 border border-solid flex px-5 py-2.5 items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-default"
                    >
                      <EyeOff className="size-4" /> BLIND
                    </button>
                    <button
                      type="button"
                      onClick={onChaal}
                      disabled={!isYourTurn}
                      className="bg-[linear-gradient(145deg,#f5d76e,#d4af37)] shadow-[0_0_18px_rgba(212,175,55,0.5)] font-bold rounded-xl text-[#1a1206] text-sm leading-5 flex px-6 py-2.5 items-center gap-2 border-0 cursor-pointer disabled:opacity-45 disabled:cursor-default"
                    >
                      <CircleDollarSign className="size-4" /> CHAAL {chaal}
                    </button>
                    <button
                      type="button"
                      onClick={onSee}
                      disabled={!isYourTurn || !!youSeat?.seen}
                      className="font-semibold rounded-xl bg-neutral-800/60 text-[#d4af37] text-sm leading-5 border-[#d4af37]/40 border border-solid flex px-5 py-2.5 items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-default"
                    >
                      <Eye className="size-4" /> SEE
                    </button>
                    <button
                      type="button"
                      onClick={onShow}
                      disabled={!isYourTurn || !canShow}
                      className="bg-[linear-gradient(145deg,#1bd6a0,#0e8f6a)] shadow-[0_0_18px_rgba(27,214,160,0.4)] font-bold rounded-xl text-white text-sm leading-5 flex px-5 py-2.5 items-center gap-2 border-0 cursor-pointer disabled:opacity-45 disabled:cursor-default"
                    >
                      <Swords className="size-4" /> SHOW
                    </button>
                    <button
                      type="button"
                      onClick={onPack}
                      disabled={!isYourTurn}
                      className="font-semibold rounded-xl bg-[#c41e3a]/15 text-[#c41e3a] text-sm leading-5 border-[#c41e3a]/50 border border-solid flex px-5 py-2.5 items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-default"
                    >
                      <XCircle className="size-4" /> PACK
                    </button>
                  </div>
                </div>
              )}

              {phase === 'ended' && (
                <div className="flex justify-center shrink-0">
                  <button
                    type="button"
                    onClick={onReset}
                    className="px-6 py-2.5 rounded-xl bg-[linear-gradient(145deg,#f5d76e,#d4af37)] text-[#1a1206] font-extrabold text-sm border-0 cursor-pointer"
                  >
                    New Round
                  </button>
                </div>
              )}
            </main>

            <aside className="game-sidebar game-sidebar-wide shrink-0 flex flex-col min-h-0">
              <div className="game-panel backdrop-blur-md bg-neutral-900/50 border-[#d4af37]/25 border border-solid gap-3 flex flex-col rounded-xl">
                <div className="text-[#d4af37] text-base leading-6 flex items-center gap-2 font-semibold">
                  <Trophy className="size-4" />
                  Round Info
                </div>
                <div className="flex flex-col gap-2">
                  <div className="rounded-xl bg-[#d4af37]/12 border-[#d4af37]/40 border border-solid flex p-3 justify-between items-center">
                    <span className="text-[#a1a1a1] text-xs leading-4">Current Pot</span>
                    <span className="font-extrabold text-[#d4af37] text-lg leading-7">PKR {formatPkr(pot)}</span>
                  </div>
                  <div className="rounded-xl bg-neutral-800/40 border-white/10 border border-solid flex p-2.5 justify-between items-center">
                    <span className="text-[#a1a1a1] text-xs leading-4">Boot</span>
                    <span className="font-bold text-neutral-50 text-sm leading-5">PKR {game?.boot ?? boot}</span>
                  </div>
                  <div className="rounded-xl bg-neutral-800/40 border-white/10 border border-solid flex p-2.5 justify-between items-center">
                    <span className="text-[#a1a1a1] text-xs leading-4">Players</span>
                    <span className="font-bold text-neutral-50 text-sm leading-5">
                      {game ? activeCount(game) : 0} / 4
                    </span>
                  </div>
                  {youHand && youSeat?.seen && (
                    <div className="rounded-xl bg-[#1bd6a0]/10 border-[#1bd6a0]/30 border border-solid flex p-2.5 justify-between items-center">
                      <span className="text-[#a1a1a1] text-xs leading-4">Your Hand</span>
                      <span className="font-bold text-[#1bd6a0] text-sm leading-5">
                        {formatHandDisplay(youHand, youSeat.cards)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="game-panel min-h-0 backdrop-blur-md bg-neutral-900/50 border-[#d4af37]/25 border border-solid flex-1 flex flex-col gap-3 overflow-hidden rounded-xl">
                <div className="text-neutral-50 text-sm leading-5 flex items-center gap-2 font-semibold">
                  <MessageCircle className="size-4 text-[#d4af37]" />
                  Table Chat
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto min-h-0">
                  {CHAT.map((c) => (
                    <div key={c.who} className="flex items-start gap-2">
                      <span
                        className="size-6 font-bold rounded-full text-[10px] flex mt-0.5 justify-center items-center shrink-0"
                        style={{ background: c.color, color: c.you ? '#1a1206' : '#fff' }}
                      >
                        {c.who}
                      </span>
                      <div
                        className={`rounded-xl text-[11px] px-2.5 py-1.5 ${
                          c.you
                            ? 'bg-[#d4af37]/20 text-neutral-50 border-[#d4af37]/30 border border-solid'
                            : 'bg-neutral-800/60 text-neutral-50'
                        }`}
                      >
                        {c.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>

          <footer className="game-footer relative z-10 border-[#d4af37]/15 border-t border-solid flex px-8 py-3 items-center gap-6 shrink-0">
            <div className="flex items-center flex-1 gap-3 overflow-hidden">
              <span className="shrink-0 font-bold rounded-full bg-[#c41e3a]/15 text-[#c41e3a] text-[11px] border-[#c41e3a]/40 border border-solid flex px-2.5 py-1 items-center gap-1.5">
                <span className="size-1.5 animate-pulse rounded-full bg-[#c41e3a]" />
                LIVE WINS
              </span>
              <div className="flex items-center gap-3 overflow-hidden">
                {LIVE_WINS.map((w, i) => (
                  <div
                    key={w.name}
                    className="shrink-0 rounded-full bg-neutral-900/60 border-[#d4af37]/20 border border-solid flex px-3 py-1.5 items-center gap-2"
                  >
                    {i === 1 ? (
                      <Gem className="size-3.5 text-[#1bd6a0]" />
                    ) : i === 3 ? (
                      <Sparkles className="size-3.5 text-[#d4af37]" />
                    ) : (
                      <Coins className="size-3.5 text-[#d4af37]" />
                    )}
                    <span className="text-neutral-50 text-xs leading-4 whitespace-nowrap">
                      {w.name} won{' '}
                      <span className="font-bold text-[#1bd6a0]">PKR {formatPkr(w.amount)}</span> · {w.hand}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2 w-[420px]">
              <div className="rounded-full bg-neutral-900/60 border-[#d4af37]/20 border border-solid flex px-4 py-2 items-center flex-1 gap-2">
                <Smile className="size-4 text-[#a1a1a1]" />
                <input
                  className="bg-transparent outline-none text-neutral-50 text-sm leading-5 flex-1 min-w-0"
                  placeholder="Type a message..."
                  readOnly
                />
              </div>
              <button
                type="button"
                className="size-10 bg-[linear-gradient(145deg,#f5d76e,#d4af37)] shadow-[0_0_14px_rgba(212,175,55,0.5)] rounded-full text-[#1a1206] flex justify-center items-center border-0 cursor-pointer"
              >
                <Send className="size-4" />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
