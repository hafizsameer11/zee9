export type SlotSymbol = { id: string; label: string; weight: number; payout: number }

export type SlotConfig = {
  gameId: string
  title: string
  symbols: SlotSymbol[]
}

const BASE_SYMBOLS: SlotSymbol[] = [
  { id: '7', label: '7', weight: 5, payout: 10 },
  { id: 'bar', label: 'BAR', weight: 10, payout: 5 },
  { id: 'cherry', label: '🍒', weight: 20, payout: 3 },
  { id: 'lemon', label: '🍋', weight: 25, payout: 2 },
  { id: 'bell', label: '🔔', weight: 15, payout: 4 },
  { id: 'star', label: '⭐', weight: 25, payout: 2 },
]

function themed(symbols: Partial<Record<string, Partial<SlotSymbol>>>): SlotSymbol[] {
  return BASE_SYMBOLS.map((s) => ({ ...s, ...symbols[s.id] }))
}

export const SLOT_CONFIGS: Record<string, SlotConfig> = {
  'mahjong-ways-2': {
    gameId: 'mahjong-ways-2',
    title: 'Mahjong Ways 2',
    symbols: themed({
      '7': { label: '🀄', payout: 12 },
      bar: { label: '🎋', payout: 6 },
      cherry: { label: '🏮', payout: 3 },
    }),
  },
  'fortune-ox': {
    gameId: 'fortune-ox',
    title: 'Fortune Ox',
    symbols: themed({
      '7': { label: '🐂', payout: 15 },
      bar: { label: '🪙', payout: 6 },
      bell: { label: '🧧', payout: 5 },
    }),
  },
  crazy777: {
    gameId: 'crazy777',
    title: 'Crazy777',
    symbols: themed({
      '7': { label: '7️⃣', payout: 20 },
      bar: { label: '7', payout: 8 },
    }),
  },
  'super-ace': {
    gameId: 'super-ace',
    title: 'Super Ace',
    symbols: themed({
      '7': { label: '👑', payout: 12 },
      star: { label: '♠', payout: 4 },
      bell: { label: '♦', payout: 4 },
    }),
  },
  'pinata-wins': {
    gameId: 'pinata-wins',
    title: 'Pinata Wins',
    symbols: themed({
      cherry: { label: '🎉', payout: 4 },
      lemon: { label: '💃', payout: 3 },
      star: { label: '🌮', payout: 3 },
    }),
  },
}

function weightedPick(symbols: SlotSymbol[]): SlotSymbol {
  const total = symbols.reduce((a, s) => a + s.weight, 0)
  let r = Math.random() * total
  for (const s of symbols) {
    r -= s.weight
    if (r <= 0) return s
  }
  return symbols[symbols.length - 1]!
}

export function spinReels(config: SlotConfig): [SlotSymbol, SlotSymbol, SlotSymbol] {
  return [weightedPick(config.symbols), weightedPick(config.symbols), weightedPick(config.symbols)]
}

export function slotPayout(reels: [SlotSymbol, SlotSymbol, SlotSymbol], bet: number): number {
  const [a, b, c] = reels
  if (a.id === b.id && b.id === c.id) return bet * a.payout
  if (a.id === b.id || b.id === c.id || a.id === c.id) {
    const match = a.id === b.id ? a : b.id === c.id ? b : a
    return bet * (match.payout * 0.3)
  }
  return 0
}
