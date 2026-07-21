import { prisma } from '../../lib/prisma.js'

export type GameLiveStats = {
  plays: number
  wagered: bigint
  playerWins: number
  playerLosses: number
  playerWonAmount: bigint
  playerLostAmount: bigint
  houseProfit: bigint
  activeRounds: number
}

/** Aggregate real round data per game slug (ignores seeded Game.plays/ggr). */
export async function statsBySlug(): Promise<Map<string, GameLiveStats>> {
  const rounds = await prisma.gameRound.groupBy({
    by: ['gameSlug', 'state'],
    _count: { _all: true },
    _sum: { bet: true, payout: true },
  })

  const map = new Map<string, GameLiveStats>()
  const ensure = (slug: string): GameLiveStats => {
    let s = map.get(slug)
    if (!s) {
      s = {
        plays: 0,
        wagered: 0n,
        playerWins: 0,
        playerLosses: 0,
        playerWonAmount: 0n,
        playerLostAmount: 0n,
        houseProfit: 0n,
        activeRounds: 0,
      }
      map.set(slug, s)
    }
    return s
  }

  for (const row of rounds) {
    const s = ensure(row.gameSlug)
    const bet = row._sum.bet ?? 0n
    const payout = row._sum.payout ?? 0n
    const count = row._count._all

    if (row.state === 'ACTIVE') {
      s.activeRounds += count
      // Bet already taken; treat as still in play (not settled P/L yet)
      s.wagered += bet
      s.plays += count
      continue
    }

    s.plays += count
    s.wagered += bet

    if (row.state === 'CASHED_OUT') {
      s.playerWins += count
      s.playerWonAmount += payout
      s.houseProfit += bet - payout
    } else if (row.state === 'BUST') {
      s.playerLosses += count
      s.playerLostAmount += bet
      s.houseProfit += bet
    }
  }

  return map
}

export async function listGamesWithStats() {
  const [games, stats] = await Promise.all([
    prisma.game.findMany({ orderBy: { order: 'asc' } }),
    statsBySlug(),
  ])

  return games.map((g) => {
    const s = stats.get(g.slug) ?? {
      plays: 0,
      wagered: 0n,
      playerWins: 0,
      playerLosses: 0,
      playerWonAmount: 0n,
      playerLostAmount: 0n,
      houseProfit: 0n,
      activeRounds: 0,
    }
    return {
      ...g,
      // Live stats override stale seeded counters
      plays: s.plays,
      wagered: s.wagered,
      playerWins: s.playerWins,
      playerLosses: s.playerLosses,
      playerWonAmount: s.playerWonAmount,
      playerLostAmount: s.playerLostAmount,
      houseProfit: s.houseProfit,
      ggr: s.houseProfit,
      activeRounds: s.activeRounds,
    }
  })
}
