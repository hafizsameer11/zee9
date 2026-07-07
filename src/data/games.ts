export const CURRENCY = 'PKR'
export const DEMO_BALANCE = 1250.0

export type GameCategory = 'hot' | 'cards' | 'lottery' | 'casual' | 'sports'

export type Game = {
  id: string
  name: string
  category: GameCategory
  emoji: string
  players: string
  hot?: boolean
  new?: boolean
  minBet: number
}

export const GAMES: Game[] = [
  { id: 'dragon-tiger', name: 'Dragon Tiger', category: 'hot', emoji: '🐉', players: '2.4k', hot: true, minBet: 10 },
  { id: 'mines', name: 'Mines', category: 'hot', emoji: '💣', players: '1.8k', hot: true, minBet: 20 },
  { id: 'teen-patti', name: 'Teen Patti', category: 'cards', emoji: '🃏', players: '3.1k', hot: true, minBet: 50 },
  { id: 'roulette', name: 'Cash Roulette', category: 'hot', emoji: '🎡', players: '980', minBet: 10 },
  { id: 'wingo', name: 'Wingo Lottery', category: 'lottery', emoji: '🎯', players: '5.2k', hot: true, new: true, minBet: 10 },
  { id: '7up-down', name: '7 UP Down', category: 'lottery', emoji: '7️⃣', players: '1.2k', minBet: 10 },
  { id: 'blackjack', name: 'Blackjack', category: 'cards', emoji: '🂡', players: '760', minBet: 100 },
  { id: 'ludo', name: 'Ludo', category: 'casual', emoji: '🎲', players: '4.5k', minBet: 20 },
  { id: 'fruit-party', name: 'Fruit Party', category: 'casual', emoji: '🍒', players: '890', new: true, minBet: 10 },
  { id: 'rummy', name: 'Rummy', category: 'cards', emoji: '♠️', players: '1.5k', minBet: 50 },
  { id: 'jhandi-munda', name: 'Jhandi Munda', category: 'cards', emoji: '🎰', players: '620', minBet: 20 },
  { id: 'cricket', name: 'Cricket Battle', category: 'sports', emoji: '🏏', players: '2.1k', minBet: 50 },
  { id: 'black-red', name: 'Black Red', category: 'lottery', emoji: '🔴', players: '1.1k', minBet: 10 },
  { id: 'texas', name: 'Texas Cowboys', category: 'cards', emoji: '🤠', players: '430', minBet: 100 },
]

export const CATEGORY_LABELS: Record<GameCategory, string> = {
  hot: '🔥 Hot Games',
  cards: '🃏 Card Games',
  lottery: '🎯 Lottery',
  casual: '🎲 Casual',
  sports: '🏏 Sports',
}

export const PROMOTIONS = [
  { id: 'welcome', title: 'Welcome Bonus', desc: '100% on first deposit up to 5,000 PKR', tag: 'NEW' },
  { id: 'spin', title: 'Lucky Spin', desc: 'Deposit 1,000+ PKR & spin to win prizes', tag: 'HOT' },
  { id: 'referral', title: 'Refer & Earn', desc: 'Get 20% commission on friend deposits', tag: 'EARN' },
  { id: 'lottery', title: 'Zee9 Rich Ticket', desc: 'Buy ticket for 500 PKR — win up to 1M!', tag: 'JACKPOT' },
]
