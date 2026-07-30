export type OrderStatus = 'pending' | 'checking' | 'processing' | 'success' | 'fail'

export interface CollectionOrder {
  id: string
  orderNo: string
  type: 'DEPOSIT' | 'WITHDRAW'
  amount: number
  reward: number
  account: string
  time: string
  status: OrderStatus
  method: 'Jazzcash' | 'Easypaisa'
  collectionAccount: string
  collectionHolder?: string
  playerName?: string
  trxId?: string
  /** ISO time when player submitted TID — starts merchant confirm window */
  submittedAt?: string
  createdAt?: string
  /** Admin overrode merchant Fail — show Fail + Manual Done */
  manualDone?: boolean
}

export interface BankAccount {
  id: string
  number: string
  holder: string
  method: 'Easypaisa' | 'Jazzcash' | 'Bank'
  on: boolean
  awaiting?: boolean
}

export interface Txn {
  id: string
  type: string
  amount: number
  time: string
}

export const USER = {
  name: 'Shahzaib',
  userId: '882',
  phone: '319****6446',
  version: 'v1.1.0',
}

export const BALANCE = {
  balance: 131944.26,
  freeze: 120000.0,
}

export const STATS = {
  today: { colAmount: 83700.0, colReward: 1674.0, payAmount: 12455.0, payReward: 249.1 },
  week: { colAmount: 1009700.0, colReward: 20194.0, payAmount: 168166.0, payReward: 3363.32 },
  month: { colAmount: 4231500.0, colReward: 84630.0, payAmount: 702880.0, payReward: 14057.6 },
}

const now = new Date('2026-06-27T18:11:00')
function ts(minsAgo: number) {
  const d = new Date(now.getTime() - minsAgo * 60000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export const ACCOUNT_DETAILS: Txn[] = [
  { id: 't1', type: 'Collection (freezing)', amount: 20000, time: ts(0) },
  { id: 't2', type: 'Collection (freezing)', amount: 20000, time: ts(1) },
  { id: 't3', type: 'Collection (freezing)', amount: 20000, time: ts(2) },
]

export const TXN_TYPES = [
  'Manual payment',
  'Manual deduction',
  'Manual markup (freeze)',
  'Manual deduction (thawing)',
  'Payment (principal)',
  'Payment (rewards)',
  'Collection (freezing)',
  'Collection (unfreeze)',
  'Collection (reward)',
  'Collection (deduct balance)',
  'Recharge-add money principal amount',
  'Withdrawal-freeze',
  'Withdrawal- unfreeze',
  'Withdrawal-deduct amount',
]

export const TRANSACTIONS: Txn[] = [
  { id: 'x1', type: 'Collection (unfreeze)', amount: 1000, time: ts(1) },
  { id: 'x2', type: 'Collection (unfreeze)', amount: 3000, time: ts(4) },
  { id: 'x3', type: 'Collection (freezing)', amount: 20000, time: ts(6) },
  { id: 'x4', type: 'Collection (unfreeze)', amount: 5000, time: ts(11) },
  { id: 'x5', type: 'Collection (reward)', amount: 400, time: ts(14) },
  { id: 'x6', type: 'Payment (principal)', amount: 12455, time: ts(20) },
  { id: 'x7', type: 'Payment (rewards)', amount: 249.1, time: ts(21) },
  { id: 'x8', type: 'Collection (deduct balance)', amount: 300, time: ts(28) },
  { id: 'x9', type: 'Recharge-add money principal amount', amount: 65000, time: ts(40) },
  { id: 'x10', type: 'Withdrawal-freeze', amount: 8000, time: ts(55) },
]

export const INITIAL_ACCOUNTS: BankAccount[] = [
  { id: 'a1', number: '03497805882', holder: 'ADNAN ALI', method: 'Easypaisa', on: true },
  { id: 'a2', number: '03406305009', holder: 'ADNAN ALI', method: 'Easypaisa', on: true },
  { id: 'a3', number: '03491803828', holder: 'ABID KHAN', method: 'Jazzcash', on: false },
  { id: 'a4', number: '03366398894', holder: 'AMIR SOHAIL', method: 'Easypaisa', on: true },
  { id: 'a5', number: '03296854473', holder: 'BILAL AHMED', method: 'Jazzcash', on: true },
  { id: 'a6', number: '03426327813', holder: 'USMAN TARIQ', method: 'Easypaisa', on: false, awaiting: true },
  { id: 'a7', number: '03257232313', holder: 'ZEESHAN', method: 'Easypaisa', on: true },
]

function orderNo(seed: string) {
  return `P2606271${seed}`
}

export const INITIAL_ORDERS: CollectionOrder[] = [
  { id: 'o1', orderNo: orderNo('2511410001858448'), type: 'DEPOSIT', amount: 20000, reward: 400, account: '03406305009', time: ts(14), status: 'pending', method: 'Jazzcash', collectionAccount: '03714212331' },
  { id: 'o2', orderNo: orderNo('2492810001841222'), type: 'DEPOSIT', amount: 20000, reward: 400, account: '03406305009', time: ts(18), status: 'pending', method: 'Easypaisa', collectionAccount: '03366398894' },
  { id: 'o3', orderNo: orderNo('2481910001845085'), type: 'DEPOSIT', amount: 30000, reward: 600, account: '03406305009', time: ts(22), status: 'pending', method: 'Jazzcash', collectionAccount: '03491803828' },
  { id: 'o4', orderNo: orderNo('2440910001854536'), type: 'DEPOSIT', amount: 300, reward: 6, account: '03406305009', time: ts(31), status: 'pending', method: 'Easypaisa', collectionAccount: '03497805882' },
]

export const HISTORY_ORDERS: CollectionOrder[] = [
  { id: 'h1', orderNo: orderNo('2511410001858448'), type: 'DEPOSIT', amount: 20000, reward: 400, account: '03406305009', time: ts(15), status: 'fail', method: 'Jazzcash', collectionAccount: '03714212331' },
  { id: 'h2', orderNo: orderNo('2484210001813229'), type: 'DEPOSIT', amount: 20000, reward: 400, account: '03406305009', time: ts(17), status: 'fail', method: 'Easypaisa', collectionAccount: '03366398894' },
  { id: 'h3', orderNo: orderNo('2481910001845085'), type: 'DEPOSIT', amount: 30000, reward: 600, account: '03406305009', time: ts(17), status: 'success', method: 'Jazzcash', collectionAccount: '03491803828' },
  { id: 'h4', orderNo: orderNo('2340910001804536'), type: 'DEPOSIT', amount: 300, reward: 6, account: '03406305009', time: ts(31), status: 'success', method: 'Easypaisa', collectionAccount: '03497805882' },
  { id: 'h5', orderNo: orderNo('2332710003428491'), type: 'DEPOSIT', amount: 500, reward: 10, account: '03406305009', time: ts(32), status: 'processing', method: 'Easypaisa', collectionAccount: '03296854473' },
  { id: 'h6', orderNo: orderNo('2244310001849968'), type: 'DEPOSIT', amount: 1000, reward: 20, account: '03406305009', time: ts(41), status: 'success', method: 'Jazzcash', collectionAccount: '03257232313' },
]

export const DEPOSIT_HISTORY: Txn[] = [
  { id: 'd1', type: 'Deposit (approved)', amount: 65000, time: ts(40) },
  { id: 'd2', type: 'Withdraw (completed)', amount: 30000, time: ts(120) },
  { id: 'd3', type: 'Deposit (approved)', amount: 50000, time: ts(240) },
  { id: 'd4', type: 'Withdraw (completed)', amount: 15000, time: ts(360) },
  { id: 'd5', type: 'Deposit (approved)', amount: 100000, time: ts(1440) },
]

export const WALLET_ACCOUNT = '03406305009'

export const PAYOUT_BANK = {
  amount: 20000,
  bankName: 'Meezan',
  accountNo: '99480112801078',
  accountTitle: 'ABID KHAN',
}
