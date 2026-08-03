import { isDevelopedGame } from '../games/developedGames'

export const DEMO_BALANCE = 3150

export const S9_CURRENCY_SYMBOL = 'Rs '

export function formatS9Amount(n: number) {
  return `${S9_CURRENCY_SYMBOL}${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export type S9Category = 'hot' | 'love' | 'games' | 'slot' | 'live' | 'card' | 'sports' | 'all'

export type S9Game = {
  id: string
  name: string
  badge?: 'hot' | 'new' | 'live'
  categories: S9Category[]
  emoji: string
  thumbBg: string
  barColor: string
}

export type CategoryConfig = {
  id: S9Category
  label: string
  title: string
  subtitle: string
  showPromo?: boolean
  promoTitle?: string
  promoSub?: string
}

export const SIDEBAR_ITEMS: { id: S9Category; label: string }[] = [
  { id: 'love', label: 'LOBBY' },
  { id: 'games', label: 'GAMES' },
  { id: 'slot', label: 'SLOT' },
  { id: 'live', label: 'LIVE' },
  { id: 'card', label: 'EVENTS' },
  { id: 'sports', label: 'RANKING' },
  { id: 'all', label: 'MORE' },
]

export const CATEGORY_CONFIG: Record<S9Category, CategoryConfig> = {
  hot: {
    id: 'hot',
    label: 'HOT',
    title: 'Hot Games',
    subtitle: 'Most played right now',
    showPromo: true,
    promoTitle: 'EXTRA BONUS',
    promoSub: '10TH, 20TH & 30TH',
  },
  love: {
    id: 'love',
    label: 'LOVE',
    title: 'Love Games',
    subtitle: 'Romantic & fun picks',
  },
  games: {
    id: 'games',
    label: 'GAMES',
    title: 'Arcade Games',
    subtitle: 'Crash · Mines · Lottery',
  },
  slot: {
    id: 'slot',
    label: 'SLOT',
    title: 'Slot Games',
    subtitle: 'Spin & win jackpots',
    showPromo: true,
    promoTitle: 'JACKPOT',
    promoSub: 'Spin to win 1M!',
  },
  live: {
    id: 'live',
    label: 'LIVE',
    title: 'Live Casino',
    subtitle: 'Real dealers · Live play',
  },
  card: {
    id: 'card',
    label: 'CARD',
    title: 'Card Games',
    subtitle: 'Teen Patti · Rummy · Poker',
  },
  sports: {
    id: 'sports',
    label: 'SPORTS',
    title: 'Sports',
    subtitle: 'Cricket & more',
  },
  all: {
    id: 'all',
    label: 'ALL',
    title: 'All Games',
    subtitle: 'Browse full catalog',
  },
}

export const S9_GAMES: S9Game[] = [
  // HOT
  { id: 'roulette', name: 'ROULETTE', badge: 'hot', categories: ['hot', 'live', 'games', 'all'], emoji: '🎡', thumbBg: 'linear-gradient(145deg,#0d3a24,#145536,#1a100a)', barColor: '#c9a227' },
  { id: 'car-roulette', name: 'CAR ROULETTE', badge: 'new', categories: ['hot', 'live', 'games', 'all'], emoji: '🏎️', thumbBg: 'linear-gradient(145deg,#1a237e,#283593,#0d47a1)', barColor: '#3d5afe' },
  { id: 'zoo-roulette', name: 'ZOO ROULETTE', badge: 'new', categories: ['hot', 'live', 'games', 'all'], emoji: '🦁', thumbBg: 'linear-gradient(145deg,#0a2818,#145536,#1a0a30)', barColor: '#c9a227' },
  { id: 'mahjong-ways-2', name: 'Mahjong Ways 2', badge: 'hot', categories: ['hot', 'slot', 'all'], emoji: '🀄', thumbBg: 'linear-gradient(145deg,#2e7d32,#1b5e20,#0d3010)', barColor: '#2e7d32' },
  { id: 'pinata-wins', name: 'Pinata Wins', badge: 'new', categories: ['hot', 'love', 'slot', 'all'], emoji: '💃', thumbBg: 'linear-gradient(145deg,#ff6b35,#c0392b,#8e44ad)', barColor: '#e67e22' },
  { id: 'wingo-lottery', name: 'WIN GO LOTTERY', badge: 'hot', categories: ['hot', 'games', 'all'], emoji: '🎯', thumbBg: 'linear-gradient(145deg,#0a6a6e,#1de9b6,#ff5722)', barColor: '#00838f' },
  { id: 'teen-patti', name: 'TEEN PATTI', badge: 'hot', categories: ['hot', 'card', 'live', 'all'], emoji: '🂡', thumbBg: 'linear-gradient(145deg,#1b5e20,#2e7d32,#1a1a1a)', barColor: '#2e7d32' },
  { id: 'chicken-road', name: 'CHICKEN ROAD', badge: 'hot', categories: ['hot', 'games', 'love', 'all'], emoji: '🐔', thumbBg: 'linear-gradient(145deg,#1b4332,#2d6a4f,#081c15)', barColor: '#d4af37' },
  { id: 'mines', name: 'MINES', badge: 'hot', categories: ['hot', 'games', 'all'], emoji: '💣', thumbBg: 'linear-gradient(145deg,#37474f,#263238,#000)', barColor: '#455a64' },
  { id: 'aviator', name: 'AVIATOR', badge: 'hot', categories: ['hot', 'games', 'all'], emoji: '✈️', thumbBg: 'linear-gradient(145deg,#e53935,#b71c1c,#1a1a1a)', barColor: '#c62828' },
  { id: 'fortune-gems-2', name: 'Fortune Gems 2', badge: 'hot', categories: ['hot', 'slot', 'love', 'all'], emoji: '💎', thumbBg: 'linear-gradient(145deg,#ffd54f,#ff6f00,#bf360c)', barColor: '#e65100' },
  { id: 'aero-x', name: 'AEROX', badge: 'hot', categories: ['hot', 'love', 'games', 'all'], emoji: '🚀', thumbBg: 'linear-gradient(145deg,#1a1208,#ff8a28,#0a0c10)', barColor: '#ff8a28' },
  { id: 'wild-bounty', name: 'WILD BOUNTY', badge: 'hot', categories: ['hot', 'love', 'slot', 'all'], emoji: '🤠', thumbBg: 'linear-gradient(145deg,#482411,#b66a1f,#211008)', barColor: '#d28a32' },
  { id: 'fortune-ox', name: 'Fortune Ox', badge: 'new', categories: ['hot', 'slot', 'all'], emoji: '🐂', thumbBg: 'linear-gradient(145deg,#ef5350,#c62828,#b71c1c)', barColor: '#2980b9' },
  { id: 'fortune-gems', name: 'Fortune Gems', badge: 'hot', categories: ['hot', 'slot', 'all'], emoji: '💎', thumbBg: 'linear-gradient(145deg,#ffd54f,#ff8f00,#e65100)', barColor: '#f57c00' },
  { id: 'crazy777', name: 'Crazy777', categories: ['hot', 'slot', 'all'], emoji: '7️⃣', thumbBg: 'linear-gradient(145deg,#ffeb3b,#ff9800,#e65100)', barColor: '#27ae60' },
  { id: 'double-crash', name: 'DOUBLE CRASH', badge: 'hot', categories: ['hot', 'games', 'all'], emoji: '🚀', thumbBg: 'linear-gradient(145deg,#e91e8c,#9c27b0,#673ab7)', barColor: '#ad1457' },
  { id: 'super-ace', name: 'Super Ace', categories: ['hot', 'slot', 'all'], emoji: '👑', thumbBg: 'linear-gradient(145deg,#ffd54f,#ff8f00,#e65100)', barColor: '#f39c12' },
  { id: 'double-fortune', name: 'Double Fortune', badge: 'new', categories: ['hot', 'love', 'slot', 'all'], emoji: '🧧', thumbBg: 'linear-gradient(145deg,#8b1010,#dc2929,#f6b632)', barColor: '#c72424' },

  // LOVE
  { id: 'clover-coins', name: 'Clover Coins 3x3', badge: 'new', categories: ['love', 'slot', 'all'], emoji: '🍀', thumbBg: 'linear-gradient(145deg,#43a047,#2e7d32,#1b5e20)', barColor: '#27ae60' },
  { id: 'fortune-dragon', name: 'Fortune Dragon', badge: 'new', categories: ['love', 'slot', 'all'], emoji: '🐉', thumbBg: 'linear-gradient(145deg,#ffd700,#ff6f00,#bf360c)', barColor: '#e65100' },
  { id: 'fruit-party', name: 'Fruit Party', categories: ['love', 'slot', 'all'], emoji: '🍒', thumbBg: 'linear-gradient(145deg,#e91e63,#f06292,#fce4ec)', barColor: '#e91e8c' },
  { id: 'treasures-aztec', name: 'TREASURES OF AZTEC', categories: ['love', 'slot', 'all'], emoji: '👸', thumbBg: 'linear-gradient(145deg,#6a1b9a,#4a148c,#311b92)', barColor: '#8e24aa' },

  // GAMES
  { id: 'wingo', name: 'WinGo', badge: 'hot', categories: ['games', 'all'], emoji: '🎱', thumbBg: 'linear-gradient(145deg,#e53935,#1e88e5,#43a047)', barColor: '#c0392b' },
  { id: '7up-down', name: 'UP DOWN', categories: ['games', 'all'], emoji: '🎲', thumbBg: 'linear-gradient(145deg,#ffeb3b,#fbc02d,#f57f17)', barColor: '#f9a825' },
  { id: 'crash', name: 'CRASH', categories: ['games', 'all'], emoji: '🚀', thumbBg: 'linear-gradient(145deg,#1565c0,#0d47a1,#1a237e)', barColor: '#1565c0' },
  { id: 'black-red', name: 'Black Red', categories: ['games', 'all'], emoji: '🔴', thumbBg: 'linear-gradient(145deg,#c62828,#1a1a1a,#c62828)', barColor: '#b71c1c' },
  { id: 'jhandi-munda', name: 'JHANDI MUNDA', badge: 'new', categories: ['hot', 'games', 'card', 'live', 'all'], emoji: '🎰', thumbBg: 'linear-gradient(145deg,#0d4a32,#145536,#1a100a)', barColor: '#c9a227' },
  { id: 'jackpot-fishing', name: 'JackPot Fishing', categories: ['games', 'all'], emoji: '🦈', thumbBg: 'linear-gradient(145deg,#00bcd4,#0277bd,#01579b)', barColor: '#e91e8c' },
  { id: 'ocean-king', name: 'Ocean King Jackpot', categories: ['games', 'all'], emoji: '💀', thumbBg: 'linear-gradient(145deg,#26c6da,#00838f,#004d40)', barColor: '#1a5276' },
  { id: 'all-star-fishing', name: 'All-star Fishing', categories: ['games', 'all'], emoji: '🐟', thumbBg: 'linear-gradient(145deg,#ff7043,#e64a19,#bf360c)', barColor: '#ff5722' },

  // SLOT
  { id: 'lucky-pachinko', name: 'LuckyPachinko', categories: ['slot', 'all'], emoji: '🎯', thumbBg: 'linear-gradient(145deg,#e91e8c,#9c27b0,#673ab7)', barColor: '#9b59b6' },
  { id: 'money-coming', name: 'MONEY COMING', badge: 'hot', categories: ['slot', 'all'], emoji: '💵', thumbBg: 'linear-gradient(145deg,#43a047,#2e7d32,#1b5e20)', barColor: '#27ae60' },
  { id: 'fortune-coins', name: 'Fortune Coins', categories: ['slot', 'all'], emoji: '🪙', thumbBg: 'linear-gradient(145deg,#ffd54f,#ffb300,#ff8f00)', barColor: '#f9a825' },
  { id: 'ak47', name: 'AK47', categories: ['slot', 'card', 'all'], emoji: '🃏', thumbBg: 'linear-gradient(145deg,#5d4037,#3e2723,#1a1a1a)', barColor: '#6d4c41' },

  // LIVE
  { id: 'lightning-roulette', name: 'Lightning Roulette', badge: 'live', categories: ['live', 'all'], emoji: '🎡', thumbBg: 'linear-gradient(145deg,#1a1a1a,#4a148c,#1a1a1a)', barColor: '#6a1b9a' },
  { id: 'andar-bahar', name: 'Andar Bahar', badge: 'live', categories: ['live', 'card', 'all'], emoji: '🃏', thumbBg: 'linear-gradient(145deg,#b71c1c,#1b5e20,#1a1a1a)', barColor: '#c62828' },
  { id: 'dragon-tiger', name: 'Dragon Tiger', badge: 'live', categories: ['live', 'card', 'all'], emoji: '🐉', thumbBg: 'linear-gradient(145deg,#c62828,#ff6f00,#1a1a1a)', barColor: '#e65100' },

  // CARD
  { id: 'rummy', name: 'Rummy', categories: ['card', 'all'], emoji: '♠️', thumbBg: 'linear-gradient(145deg,#1b5e20,#0d3010,#1a1a1a)', barColor: '#2e7d32' },
  { id: 'blackjack', name: 'Blackjack', categories: ['card', 'all'], emoji: '🂡', thumbBg: 'linear-gradient(145deg,#212121,#424242,#1a1a1a)', barColor: '#37474f' },
  { id: 'texas', name: 'Texas Cowboys', categories: ['card', 'all'], emoji: '🤠', thumbBg: 'linear-gradient(145deg,#795548,#5d4037,#3e2723)', barColor: '#6d4c41' },

  // SPORTS
  { id: 'cricket', name: '9W CRICKET', badge: 'live', categories: ['sports', 'all'], emoji: '🏏', thumbBg: 'linear-gradient(145deg,#1565c0,#0d47a1,#1b5e20)', barColor: '#1565c0' },
  { id: 'cricket-battle', name: 'Cricket Battle', categories: ['sports', 'all'], emoji: '🏆', thumbBg: 'linear-gradient(145deg,#1b5e20,#33691e,#1b5e20)', barColor: '#2e7d32' },
  { id: 'football', name: 'Football Pro', categories: ['sports', 'all'], emoji: '⚽', thumbBg: 'linear-gradient(145deg,#1565c0,#0d47a1,#01579b)', barColor: '#1976d2' },

  // ALL extra
  { id: 'lobby', name: 'lobby', categories: ['all'], emoji: '👸', thumbBg: 'linear-gradient(145deg,#ffd700,#ff8f00,#6a1b9a)', barColor: '#e67e22' },
]

export function getGamesForCategory(category: S9Category): S9Game[] {
  if (category === 'all') return S9_GAMES
  return S9_GAMES.filter((g) => g.categories.includes(category))
}

export function getDevelopedGamesForCategory(category: S9Category): S9Game[] {
  const hidden = new Set(['bounty-trail'])
  return getGamesForCategory(category).filter(
    (g) => isDevelopedGame(g.id) && !hidden.has(g.id),
  )
}

export function getDevelopedSidebarCategories(): typeof SIDEBAR_ITEMS {
  return SIDEBAR_ITEMS.filter((item) =>
    getGamesForCategory(item.id).some((g) => isDevelopedGame(g.id)),
  )
}

export const LOBBY_FEATURED_GAME_IDS = [
  'zoo-roulette',
  'car-roulette',
  'fortune-gems-2',
  'roulette',
  'dragon-tiger',
  'chicken-road',
  'wild-bounty',
  'aero-x',
  'double-crash',
  'super-ace',
  'double-fortune',
  'mines',
  'aviator',
  'crash',
  'wingo-lottery',
  'wingo',
  '7up-down',
  'jhandi-munda',
  'money-coming',
] as const

export const REGISTER_BONUS_TIERS = [
  { deposit: 'Rs 100', cashback: 'Rs 50', maxClaim: 'Rs 50' },
  { deposit: 'Rs 500', cashback: 'Rs 300', maxClaim: 'Rs 300' },
  { deposit: 'Rs 1000', cashback: 'Rs 700', maxClaim: 'Rs 700' },
  { deposit: 'Rs 5000', cashback: 'Rs 4000', maxClaim: 'Rs 4000' },
]

export const DEMO_PLAYER = {
  name: 'Player_289005',
  vipLevel: 5,
  vipProgress: 8500,
  vipTarget: 12000,
}

export const PROMO_LEVEL_BONUS = { current: 3777, max: 3777 }

export function getLobbyFeaturedGames(): S9Game[] {
  const hidden = new Set(['bounty-trail'])
  return LOBBY_FEATURED_GAME_IDS.map(
    (id) => S9_GAMES.find((g) => g.id === id)!,
  ).filter((g) => g && !hidden.has(g.id))
}

export const TICKER_MESSAGES =
  'Player Zee9_King won 24,280 in Aviator game, congratulations! Player User_G23363 won 22,344 in AndarBahar game, congratulations on his victory!'

const GAME_THUMBS: Partial<Record<string, string>> = {
  'mahjong-ways-2': '/games/mahjong-ways-2.png',
  'pinata-wins': '/games/pinata-wins.png',
  'wingo-lottery': '/games/wingo-lottery.png',
  'teen-patti': '/games/teen-patti.png',
  mines: '/games/mines.png',
  aviator: '/games/aviator.png',
  'fortune-gems-2': '/games/fortune-gems-2.png',
  'aero-x': '/games/aero-x.png',
  'wild-bounty': '/games/wild-bounty.png',
  roulette: '/games/roulette.png',
  'car-roulette': '/games/car-roulette.png',
  'zoo-roulette': '/games/zoo-roulette.png',
  'dragon-tiger': '/games/dragon-tiger.png',
  'chicken-road': '/games/chicken-road.png',
  'double-fortune': '/games/double-fortune.png',
  'fortune-ox': '/games/fortune-ox.png',
  'fortune-gems': '/games/fortune-gems/bg-intro.png',
  crazy777: '/games/crazy777.png',
  'double-crash': '/games/double-crash.png',
  'super-ace': '/games/super-ace.png',
  'treasures-aztec': '/games/treasures-aztec.png',
  'lightning-roulette': '/games/lightning-roulette.png',
  'jackpot-fishing': '/games/jackpot-fishing.png',
  cricket: '/games/cricket.png',
  crash: '/games/crash.png',
  wingo: '/games/wingo.png',
  ak47: '/games/ak47.png',
  'lucky-pachinko': '/games/lucky-pachinko.png',
  'ocean-king': '/games/ocean-king.png',
  lobby: '/games/lobby.png',
  'clover-coins': '/games/clover-coins.png',
  'fortune-dragon': '/games/fortune-dragon.png',
  'fortune-coins': '/games/fortune-coins.png',
  'money-coming': '/games/money-coming.png',
  'all-star-fishing': '/games/all-star-fishing.png',
  '7up-down': '/games/7up-down.png',
  'jhandi-munda': '/games/jhandi-munda.png',
}

const CATEGORY_THUMB: Record<S9Category, string> = {
  hot: '/games/super-ace.png',
  love: '/games/pinata-wins.png',
  games: '/games/aviator.png',
  slot: '/games/fortune-ox.png',
  live: '/games/lightning-roulette.png',
  card: '/games/teen-patti.png',
  sports: '/games/cricket.png',
  all: '/games/mahjong-ways-2.png',
}

export function getGameThumb(game: S9Game): string {
  if (GAME_THUMBS[game.id]) return GAME_THUMBS[game.id]!
  const cat = game.categories.find((c) => c !== 'all') ?? 'all'
  return CATEGORY_THUMB[cat]
}
