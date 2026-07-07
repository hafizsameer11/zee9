export type Suit = '♠' | '♥' | '♦' | '♣'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

export type Card = { rank: Rank; suit: Suit }

export type PlayerId = 'you' | 'bot1' | 'bot2' | 'bot3'

export type HandRank = 'trail' | 'pure' | 'sequence' | 'color' | 'pair' | 'high'

export type HandResult = { rank: HandRank; score: number; label: string; labelHi: string }

export type Seat = {
  id: PlayerId
  name: string
  avatar: string
  isBot: boolean
  cards: Card[]
  seen: boolean
  packed: boolean
  betThisRound: number
}

export type TeenPattiPhase = 'idle' | 'playing' | 'showdown' | 'ended'

export type TeenPattiState = {
  phase: TeenPattiPhase
  seats: Seat[]
  pot: number
  boot: number
  turnIndex: number
  dealerIndex: number
  lastAction: string
  winnerId: PlayerId | null
  showResult: { winner: PlayerId; hand: HandResult; loserHand?: HandResult } | null
}

const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const SUITS: Suit[] = ['♠', '♥', '♦', '♣']

const SEAT_ORDER: PlayerId[] = ['you', 'bot1', 'bot2', 'bot3']

export const SEAT_META: Record<PlayerId, { name: string; avatar: string; isBot: boolean }> = {
  you: { name: 'You', avatar: 'YOU', isBot: false },
  bot1: { name: 'Raja', avatar: 'RA', isBot: true },
  bot2: { name: 'Simran', avatar: 'SI', isBot: true },
  bot3: { name: 'Arjun', avatar: 'AR', isBot: true },
}

function rankValue(r: Rank): number {
  return RANKS.indexOf(r)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  return shuffle(deck)
}

function isSequence(values: number[]): boolean {
  const sorted = [...values].sort((a, b) => b - a)
  if (sorted[0]! - sorted[1]! === 1 && sorted[1]! - sorted[2]! === 1) return true
  // A-2-3 (Teen Patti special sequence)
  if (sorted[0] === 12 && sorted[1] === 1 && sorted[2] === 0) return true
  return false
}

export function evaluateHand(cards: Card[]): HandResult {
  const ranks = cards.map((c) => c.rank).sort((a, b) => rankValue(b) - rankValue(a))
  const suits = cards.map((c) => c.suit)
  const values = ranks.map(rankValue).sort((a, b) => b - a)
  const isFlush = suits.every((s) => s === suits[0])
  const straight = isSequence(values)

  if (ranks[0] === ranks[1] && ranks[1] === ranks[2]) {
    return { rank: 'trail', score: 600 + values[0]!, label: 'Trail (Teen)', labelHi: 'तीन' }
  }
  if (straight && isFlush) {
    return { rank: 'pure', score: 500 + values[0]!, label: 'Pure Sequence', labelHi: 'पक्की' }
  }
  if (straight) {
    return { rank: 'sequence', score: 400 + values[0]!, label: 'Sequence', labelHi: 'सीक्वेंस' }
  }
  if (isFlush) {
    return { rank: 'color', score: 300 + values[0]! * 10 + values[1]!, label: 'Color', labelHi: 'रंग' }
  }
  if (ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2]) {
    const pairRank = ranks[0] === ranks[1] ? values[0]! : ranks[1] === ranks[2] ? values[1]! : values[0]!
    const kicker = ranks[0] === ranks[1] ? values[2]! : ranks[1] === ranks[2] ? values[0]! : values[1]!
    return { rank: 'pair', score: 200 + pairRank * 10 + kicker, label: 'Pair', labelHi: 'जोड़ी' }
  }
  return {
    rank: 'high',
    score: values[0]! * 100 + values[1]! * 10 + values[2]!,
    label: 'High Card',
    labelHi: 'हाई कार्ड',
  }
}

export function compareHands(a: HandResult, b: HandResult): number {
  return a.score - b.score
}

export function handStrength(cards: Card[]): number {
  const h = evaluateHand(cards)
  const base: Record<HandRank, number> = {
    trail: 95,
    pure: 85,
    sequence: 72,
    color: 58,
    pair: 42,
    high: 20,
  }
  return base[h.rank] + h.score * 0.01
}

function emptySeat(id: PlayerId): Seat {
  const meta = SEAT_META[id]
  return { id, name: meta.name, avatar: meta.avatar, isBot: meta.isBot, cards: [], seen: false, packed: false, betThisRound: 0 }
}

export function startGame(boot: number): TeenPattiState {
  const deck = createDeck()
  const seats = SEAT_ORDER.map((id, i) => ({
    ...emptySeat(id),
    cards: deck.slice(i * 3, i * 3 + 3),
  }))
  const pot = boot * 4
  return {
    phase: 'playing',
    seats,
    pot,
    boot,
    turnIndex: 0,
    dealerIndex: Math.floor(Math.random() * 4),
    lastAction: `Boot ${boot} PKR · Cards dealt`,
    winnerId: null,
    showResult: null,
  }
}

export function activeSeats(state: TeenPattiState): Seat[] {
  return state.seats.filter((s) => !s.packed)
}

export function activeCount(state: TeenPattiState): number {
  return activeSeats(state).length
}

export function currentSeat(state: TeenPattiState): Seat {
  return state.seats[state.turnIndex]!
}

export function blindAmount(state: TeenPattiState): number {
  return state.boot
}

export function chaalAmount(state: TeenPattiState, seen: boolean): number {
  return seen ? state.boot * 2 : state.boot
}

function nextTurnIndex(state: TeenPattiState, from: number): number {
  let i = (from + 1) % 4
  for (let n = 0; n < 4; n++) {
    if (!state.seats[i]!.packed) return i
    i = (i + 1) % 4
  }
  return from
}

function cloneState(state: TeenPattiState): TeenPattiState {
  return {
    ...state,
    seats: state.seats.map((s) => ({ ...s, cards: [...s.cards] })),
  }
}

function setWinner(state: TeenPattiState, winnerId: PlayerId, reason: string): TeenPattiState {
  return {
    ...cloneState(state),
    phase: 'ended',
    winnerId,
    lastAction: reason,
  }
}

export function applyPack(state: TeenPattiState): TeenPattiState {
  const next = cloneState(state)
  const seat = next.seats[next.turnIndex]!
  seat.packed = true
  next.lastAction = `${seat.name} packed`

  const remaining = activeCount(next)
  if (remaining === 1) {
    const winner = activeSeats(next)[0]!
    return setWinner(next, winner.id, `${winner.name} wins — all folded`)
  }

  next.turnIndex = nextTurnIndex(next, next.turnIndex)
  return next
}

export function applySee(state: TeenPattiState): TeenPattiState {
  const next = cloneState(state)
  next.seats[next.turnIndex]!.seen = true
  next.lastAction = `${next.seats[next.turnIndex]!.name} seen cards`
  return next
}

export function applyBlind(state: TeenPattiState, amount: number): TeenPattiState {
  const next = cloneState(state)
  const seat = next.seats[next.turnIndex]!
  seat.betThisRound += amount
  next.pot += amount
  next.lastAction = `${seat.name} blind ${amount}`
  next.turnIndex = nextTurnIndex(next, next.turnIndex)
  return next
}

export function applyChaal(state: TeenPattiState, amount: number): TeenPattiState {
  const next = cloneState(state)
  const seat = next.seats[next.turnIndex]!
  if (!seat.seen) seat.seen = true
  seat.betThisRound += amount
  next.pot += amount
  next.lastAction = `${seat.name} chaal ${amount}`
  next.turnIndex = nextTurnIndex(next, next.turnIndex)
  return next
}

export function applyShow(state: TeenPattiState): TeenPattiState {
  const next = cloneState(state)
  const challenger = next.seats[next.turnIndex]!
  challenger.seen = true

  const others = activeSeats(next).filter((s) => s.id !== challenger.id)
  const opponent = others[0]
  if (!opponent) return setWinner(next, challenger.id, `${challenger.name} wins`)

  opponent.seen = true
  const cHand = evaluateHand(challenger.cards)
  const oHand = evaluateHand(opponent.cards)
  const cmp = compareHands(cHand, oHand)
  const winner = cmp >= 0 ? challenger : opponent
  const loser = cmp >= 0 ? opponent : challenger

  return {
    ...next,
    phase: 'showdown',
    winnerId: winner.id,
    showResult: {
      winner: winner.id,
      hand: evaluateHand(winner.cards),
      loserHand: evaluateHand(loser.cards),
    },
    lastAction: `${winner.name} wins with ${evaluateHand(winner.cards).label}!`,
    seats: next.seats.map((s) => {
      if (s.packed) return s
      if (s.id === challenger.id || s.id === opponent.id) return { ...s, seen: true }
      return s
    }),
  }
}

export function finalizeShowdown(state: TeenPattiState): TeenPattiState {
  return { ...state, phase: 'ended' }
}

/** Simple bot decision */
export function botAction(state: TeenPattiState): 'blind' | 'see' | 'chaal' | 'pack' | 'show' {
  const seat = currentSeat(state)
  const strength = handStrength(seat.cards)
  const active = activeCount(state)
  const r = Math.random()

  if (!seat.seen) {
    if (strength > 80 && active === 2) return 'show'
    if (strength > 70) return r < 0.7 ? 'see' : 'blind'
    if (strength > 45) return r < 0.55 ? 'see' : r < 0.85 ? 'blind' : 'pack'
    return r < 0.35 ? 'blind' : 'pack'
  }

  if (active === 2 && strength > 55 && r < 0.65) return 'show'
  if (strength > 60) return 'chaal'
  if (strength > 35) return r < 0.6 ? 'chaal' : 'pack'
  return r < 0.25 ? 'chaal' : 'pack'
}

export function seatIndex(id: PlayerId): number {
  return SEAT_ORDER.indexOf(id)
}
