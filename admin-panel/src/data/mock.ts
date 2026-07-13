// ---------- Types ----------
export interface GameRow {
  id: string
  title: string
  emoji: string
  color: string
  category: 'Slots' | 'Crash' | 'Lottery' | 'Table' | 'Mini'
  enabled: boolean
  winPct: number // RTP / win percentage the house allows
  tag?: 'hot' | 'new'
  plays: number
  ggr: number // gross gaming revenue
  order: number
}

export interface Agent {
  id: string
  name: string
  phone: string
  level: 1 | 2 | 3
  walletsFilled: number
  active: boolean
  referrals: number
  commission: number
  commissionBalance: number
  joined: string
}

export interface AgentAccountReview {
  id: string
  agentId: string
  agentName: string
  agentPhone: string
  method: string
  number: string
  holder: string
  createdAt: string
}

export interface Player {
  id: string
  name: string
  phone: string
  balance: number
  bonus: number
  deposited: number
  withdrawn: number
  status: 'active' | 'banned' | 'new'
  vip: number
  referredBy?: string
  joined: string
}

export interface Txn {
  id: string
  user: string
  phone: string
  amount: number
  method: 'Jazzcash' | 'Easypaisa' | 'Bank'
  status: 'pending' | 'approved' | 'rejected'
  time: string
}

export interface Offer {
  id: string
  title: string
  desc: string
  type: 'Deposit' | 'Cashback' | 'Festival' | 'Referral'
  reward: string
  enabled: boolean
}

export interface CashbackTier {
  id: string
  name: string
  minLoss: number
  pct: number
  maxClaim: number
  enabled: boolean
}

export interface WheelPrize {
  id: string
  label: string
  color: string
  weight: number
  isPhysical?: boolean
}

// ---------- Settings (all controllable) ----------
export interface Settings {
  platformName: string
  currency: string
  whatsapp: string
  whatsappEnabled: boolean
  shareLink: string
  panelLink: string
  csUpperRight: boolean
  wheelsLowerTop: boolean
  tickerText: string
  // bonuses
  registrationBonus: number
  dailyOpenBonus: number
  dailyOpenNeedsDeposit: boolean
  depositBonus1: number
  depositBonus2: number
  depositBonus3: number
  dailyDepositBonus: number
  rebetBonus: boolean
  extraBonus: boolean
  // commission
  commissionL1: number
  commissionL2: number
  commissionL3: number
  walletsRequired: number
  minPerWallet: number
  // limits
  minWithdraw: number
  maxWithdraw: number
  minDeposit: number
  maxDeposit: number
  // wager
  bonusWager: number
  depositWager: number
  wheelDepositPerSpin: number
  // methods
  methodJazzcash: boolean
  methodEasypaisa: boolean
  methodBank: boolean
  methodWegars: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  platformName: 'Zee9',
  currency: 'PKR',
  whatsapp: '+92 300 1234567',
  whatsappEnabled: true,
  shareLink: 'http://localhost:5174/',
  panelLink: 'http://localhost:5300/',
  csUpperRight: true,
  wheelsLowerTop: true,
  tickerText: '',
  registrationBonus: 150,
  dailyOpenBonus: 5,
  dailyOpenNeedsDeposit: true,
  depositBonus1: 10,
  depositBonus2: 7,
  depositBonus3: 5,
  dailyDepositBonus: 7,
  rebetBonus: true,
  extraBonus: true,
  commissionL1: 30,
  commissionL2: 10,
  commissionL3: 10,
  walletsRequired: 5,
  minPerWallet: 1000,
  minWithdraw: 600,
  maxWithdraw: 50000,
  minDeposit: 300,
  maxDeposit: 100000,
  bonusWager: 5,
  depositWager: 1,
  wheelDepositPerSpin: 1000,
  methodJazzcash: true,
  methodEasypaisa: true,
  methodBank: true,
  methodWegars: true,
}

// ---------- Games ----------
export const GAMES: GameRow[] = [
  { id: 'fortune-gems', title: 'Fortune Gems', emoji: '💎', color: '#7b1f2b', category: 'Slots', enabled: true, winPct: 92, tag: 'hot', plays: 48210, ggr: 1284000, order: 1 },
  { id: 'aviator', title: 'Aviator', emoji: '✈️', color: '#2a1030', category: 'Crash', enabled: true, winPct: 95, tag: 'hot', plays: 88120, ggr: 2140000, order: 2 },
  { id: 'wingo', title: 'Wingo Lottery', emoji: '🎯', color: '#0d8a5f', category: 'Lottery', enabled: true, winPct: 90, tag: 'hot', plays: 67340, ggr: 1760000, order: 3 },
  { id: 'crash', title: 'Crash', emoji: '🚀', color: '#1b2a52', category: 'Crash', enabled: true, winPct: 94, plays: 41200, ggr: 980000, order: 4 },
  { id: 'mines', title: 'Mines', emoji: '💣', color: '#3a2a15', category: 'Mini', enabled: true, winPct: 91, tag: 'hot', plays: 39880, ggr: 720000, order: 5 },
  { id: 'fortune-ox', title: 'Fortune Ox', emoji: '🐂', color: '#7a1414', category: 'Slots', enabled: true, winPct: 92, plays: 22140, ggr: 540000, order: 6 },
  { id: '7up-down', title: '7 Up Down', emoji: '🎲', color: '#1d5c2e', category: 'Table', enabled: true, winPct: 89, plays: 30120, ggr: 610000, order: 7 },
  { id: 'teen-patti', title: 'Teen Patti', emoji: '🃏', color: '#5a1130', category: 'Table', enabled: false, winPct: 90, plays: 18110, ggr: 410000, order: 8 },
  { id: 'dragon-tiger', title: 'Dragon Tiger', emoji: '🐉', color: '#8a2410', category: 'Table', enabled: true, winPct: 93, tag: 'new', plays: 12040, ggr: 260000, order: 9 },
  { id: 'andar-bahar', title: 'Andar Bahar', emoji: '🎴', color: '#132a4a', category: 'Table', enabled: true, winPct: 92, plays: 15230, ggr: 320000, order: 10 },
  { id: 'double-crash', title: 'Double Crash', emoji: '⚡', color: '#28104a', category: 'Crash', enabled: false, winPct: 96, tag: 'new', plays: 8100, ggr: 190000, order: 11 },
  { id: 'winzo', title: 'Winzo Lottery', emoji: '🎰', color: '#0a5a52', category: 'Lottery', enabled: true, winPct: 90, plays: 20440, ggr: 480000, order: 12 },
]

const A = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

export const AGENTS: Agent[] = [
  { id: 'AG1001', name: 'Adnan Ali', phone: '0319-4426446', level: 1, walletsFilled: 5, active: true, referrals: 128, commission: 184500, commissionBalance: 0, joined: A(210) },
  { id: 'AG1002', name: 'Bilal Ahmed', phone: '0300-7781122', level: 1, walletsFilled: 5, active: true, referrals: 94, commission: 132000, commissionBalance: 0, joined: A(180) },
  { id: 'AG1003', name: 'Zeeshan Khan', phone: '0321-5566778', level: 2, walletsFilled: 3, active: false, referrals: 41, commission: 38900, commissionBalance: 0, joined: A(90) },
  { id: 'AG1004', name: 'Usman Tariq', phone: '0333-2233445', level: 1, walletsFilled: 5, active: true, referrals: 76, commission: 98700, commissionBalance: 0, joined: A(150) },
  { id: 'AG1005', name: 'Amir Sohail', phone: '0345-9988776', level: 3, walletsFilled: 2, active: false, referrals: 12, commission: 8400, commissionBalance: 0, joined: A(30) },
  { id: 'AG1006', name: 'Hamza Raza', phone: '0312-4455667', level: 2, walletsFilled: 4, active: true, referrals: 55, commission: 61200, commissionBalance: 0, joined: A(120) },
]

export const PLAYERS: Player[] = [
  { id: 'U289005', name: 'Player_289005', phone: '0319-1112223', balance: 3150, bonus: 165, deposited: 45000, withdrawn: 38000, status: 'active', vip: 5, referredBy: 'AG1001', joined: A(60) },
  { id: 'U773221', name: 'Zee9_King', phone: '0300-3334445', balance: 24280, bonus: 15, deposited: 210000, withdrawn: 180000, status: 'active', vip: 8, referredBy: 'AG1002', joined: A(120) },
  { id: 'U120993', name: 'User_G23363', phone: '0321-7778889', balance: 890, bonus: 0, deposited: 12000, withdrawn: 8000, status: 'active', vip: 2, referredBy: 'AG1001', joined: A(20) },
  { id: 'U556677', name: 'LuckyRaja', phone: '0333-1122334', balance: 5600, bonus: 150, deposited: 3000, withdrawn: 0, status: 'new', vip: 1, joined: A(2) },
  { id: 'U998877', name: 'Farhan99', phone: '0345-5566778', balance: 0, bonus: 0, deposited: 90000, withdrawn: 95000, status: 'banned', vip: 6, referredBy: 'AG1004', joined: A(200) },
  { id: 'U443322', name: 'Sana_Malik', phone: '0312-9900112', balance: 12400, bonus: 330, deposited: 60000, withdrawn: 42000, status: 'active', vip: 7, referredBy: 'AG1006', joined: A(95) },
]

export const WITHDRAWALS: Txn[] = [
  { id: 'W80231', user: 'Zee9_King', phone: '0300-3334445', amount: 24000, method: 'Jazzcash', status: 'pending', time: '2026-07-08 17:41' },
  { id: 'W80230', user: 'Sana_Malik', phone: '0312-9900112', amount: 12000, method: 'Easypaisa', status: 'pending', time: '2026-07-08 17:22' },
  { id: 'W80229', user: 'Player_289005', phone: '0319-1112223', amount: 3000, method: 'Bank', status: 'pending', time: '2026-07-08 16:58' },
  { id: 'W80228', user: 'LuckyRaja', phone: '0333-1122334', amount: 800, method: 'Jazzcash', status: 'approved', time: '2026-07-08 15:10' },
  { id: 'W80227', user: 'User_G23363', phone: '0321-7778889', amount: 5500, method: 'Easypaisa', status: 'approved', time: '2026-07-08 14:02' },
  { id: 'W80226', user: 'Farhan99', phone: '0345-5566778', amount: 50000, method: 'Bank', status: 'rejected', time: '2026-07-08 12:30' },
]

export const DEPOSITS: Txn[] = [
  { id: 'D51120', user: 'LuckyRaja', phone: '0333-1122334', amount: 3000, method: 'Jazzcash', status: 'pending', time: '2026-07-08 17:48' },
  { id: 'D51119', user: 'Player_289005', phone: '0319-1112223', amount: 5000, method: 'Easypaisa', status: 'approved', time: '2026-07-08 17:20' },
  { id: 'D51118', user: 'Sana_Malik', phone: '0312-9900112', amount: 20000, method: 'Bank', status: 'approved', time: '2026-07-08 16:40' },
  { id: 'D51117', user: 'Zee9_King', phone: '0300-3334445', amount: 30000, method: 'Jazzcash', status: 'approved', time: '2026-07-08 15:55' },
  { id: 'D51116', user: 'User_G23363', phone: '0321-7778889', amount: 1000, method: 'Easypaisa', status: 'pending', time: '2026-07-08 15:12' },
]

export const OFFERS: Offer[] = [
  { id: 'OF1', title: 'First Deposit Bonus', desc: '20% extra on your very first deposit', type: 'Deposit', reward: '+20%', enabled: true },
  { id: 'OF2', title: 'Daily Deposit Boost', desc: '10% bonus on every deposit, once per day', type: 'Deposit', reward: '+10%', enabled: true },
  { id: 'OF3', title: 'Weekly Cashback', desc: 'Get back a % of your weekly losses', type: 'Cashback', reward: 'up to 15%', enabled: true },
  { id: 'OF4', title: 'Refer & Earn', desc: 'Earn commission on 3 referral levels', type: 'Referral', reward: '30/10/10%', enabled: true },
  { id: 'OF5', title: 'Eid Mega Festival', desc: 'Festival special rewards & free spins', type: 'Festival', reward: 'Free Spins', enabled: false },
]

export const CASHBACK_TIERS: CashbackTier[] = [
  { id: 'C1', name: 'Bronze', minLoss: 1000, pct: 5, maxClaim: 500, enabled: true },
  { id: 'C2', name: 'Silver', minLoss: 5000, pct: 8, maxClaim: 2000, enabled: true },
  { id: 'C3', name: 'Gold', minLoss: 20000, pct: 12, maxClaim: 8000, enabled: true },
  { id: 'C4', name: 'Platinum', minLoss: 50000, pct: 15, maxClaim: 20000, enabled: true },
]

export const WHEEL_PRIZES: WheelPrize[] = [
  { id: 'w1', label: 'Laptop', color: '#6d5efc', weight: 1, isPhysical: true },
  { id: 'w2', label: 'Rs 10,000', color: '#f5b301', weight: 2 },
  { id: 'w3', label: 'Mobile', color: '#17b877', weight: 2, isPhysical: true },
  { id: 'w4', label: 'Rs 5,000', color: '#ef4a44', weight: 4 },
  { id: 'w5', label: 'Bike', color: '#3b9df0', weight: 1, isPhysical: true },
  { id: 'w6', label: 'Rs 1,000', color: '#9b59b6', weight: 8 },
  { id: 'w7', label: 'Rs 100', color: '#e67e22', weight: 20 },
  { id: 'w8', label: 'Rs 50', color: '#16a085', weight: 25 },
  { id: 'w9', label: 'Rs 20', color: '#c0392b', weight: 25 },
  { id: 'w10', label: 'Try Again', color: '#7f8c8d', weight: 12 },
]

// ---------- Dashboard series ----------
export const REVENUE_SERIES = [
  { d: 'Mon', dep: 420, wd: 260 },
  { d: 'Tue', dep: 560, wd: 320 },
  { d: 'Wed', dep: 480, wd: 300 },
  { d: 'Thu', dep: 720, wd: 410 },
  { d: 'Fri', dep: 890, wd: 520 },
  { d: 'Sat', dep: 1010, wd: 640 },
  { d: 'Sun', dep: 950, wd: 580 },
]
