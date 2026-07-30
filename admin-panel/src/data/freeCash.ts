export type FreeCashQuestKind =
  | 'PLAY_ROUNDS'
  | 'BET_TOTAL'
  | 'WIN_TOTAL'
  | 'DEPOSIT_COUNT'
  | 'RETURN'

export type FreeCashQuest = {
  id: string
  kind: FreeCashQuestKind
  title: string
  desc: string
  target: number
  reward: number
  tier: number
  maxTier: number
  enabled: boolean
  period: 'daily' | 'weekly'
}

export type FreeCashConfig = {
  enabled: boolean
  maxDailyReward: number
  resetHour: number
  quests: FreeCashQuest[]
}

export const DEFAULT_FREE_CASH: FreeCashConfig = {
  enabled: true,
  maxDailyReward: 2200,
  resetHour: 5,
  quests: [
    {
      id: 'play-1',
      kind: 'PLAY_ROUNDS',
      title: 'Play Games',
      desc: 'Play 79 rounds in any game',
      target: 79,
      reward: 10,
      tier: 1,
      maxTier: 5,
      enabled: true,
      period: 'daily',
    },
    {
      id: 'bet-1',
      kind: 'BET_TOTAL',
      title: 'Bet in Game',
      desc: 'Bet more than 3999 chips in games',
      target: 3999,
      reward: 15,
      tier: 1,
      maxTier: 5,
      enabled: true,
      period: 'daily',
    },
    {
      id: 'win-1',
      kind: 'WIN_TOTAL',
      title: 'Win in Game',
      desc: 'Win more than 2900 chips in games',
      target: 2900,
      reward: 12,
      tier: 1,
      maxTier: 5,
      enabled: true,
      period: 'daily',
    },
    {
      id: 'weekly-card',
      kind: 'DEPOSIT_COUNT',
      title: 'Weekly Card',
      desc: 'Recharge 1 time this week',
      target: 1,
      reward: 30,
      tier: 1,
      maxTier: 1,
      enabled: true,
      period: 'weekly',
    },
    {
      id: 'luck-1',
      kind: 'BET_TOTAL',
      title: 'Good Luck',
      desc: 'Bet 1500 chips today',
      target: 1500,
      reward: 14,
      tier: 1,
      maxTier: 4,
      enabled: true,
      period: 'daily',
    },
  ],
}
