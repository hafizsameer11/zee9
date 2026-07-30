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
  /** Target: rounds / rupees / deposit count */
  target: number
  reward: number
  tier: number
  maxTier: number
  enabled: boolean
  /** weekly = progress over 7 days; daily = since reset hour */
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

export function normalizeFreeCash(raw: unknown): FreeCashConfig {
  const d = DEFAULT_FREE_CASH
  if (!raw || typeof raw !== 'object') return { ...d, quests: d.quests.map((q) => ({ ...q })) }
  const r = raw as Partial<FreeCashConfig>
  const quests = Array.isArray(r.quests)
    ? r.quests
        .map((q, i) => {
          const base = d.quests[i] ?? d.quests[0]!
          const row = q as Partial<FreeCashQuest>
          const kind = (row.kind || base.kind) as FreeCashQuestKind
          if (!['PLAY_ROUNDS', 'BET_TOTAL', 'WIN_TOTAL', 'DEPOSIT_COUNT', 'RETURN'].includes(kind)) {
            return null
          }
          return {
            id: String(row.id || base.id || `q-${i}`),
            kind,
            title: String(row.title || base.title),
            desc: String(row.desc || base.desc),
            target: Math.max(1, Number(row.target ?? base.target) || 1),
            reward: Math.max(0, Number(row.reward ?? base.reward) || 0),
            tier: Math.max(1, Number(row.tier ?? base.tier) || 1),
            maxTier: Math.max(1, Number(row.maxTier ?? base.maxTier) || 1),
            enabled: row.enabled !== false,
            period: row.period === 'weekly' ? 'weekly' as const : 'daily' as const,
          }
        })
        .filter(Boolean) as FreeCashQuest[]
    : d.quests.map((q) => ({ ...q }))

  return {
    enabled: r.enabled !== false,
    maxDailyReward: Math.max(0, Number(r.maxDailyReward ?? d.maxDailyReward) || 0),
    resetHour: Math.min(23, Math.max(0, Number(r.resetHour ?? d.resetHour) || 0)),
    quests: quests.length ? quests : d.quests.map((q) => ({ ...q })),
  }
}
