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

const emptyStats = (): GameLiveStats => ({
  plays: 0,
  wagered: 0n,
  playerWins: 0,
  playerLosses: 0,
  playerWonAmount: 0n,
  playerLostAmount: 0n,
  houseProfit: 0n,
  activeRounds: 0,
})

/** Aggregate settled bets/wins from the ledger (slots, crash, table games, etc.). */
export async function ledgerStatsBySlug(): Promise<Map<string, GameLiveStats>> {
  const rows = await prisma.$queryRaw<
    Array<{
      slug: string
      plays: number
      wagered: bigint
      playerWins: number
      playerWonAmount: bigint
    }>
  >`
    WITH bet_rows AS (
      SELECT t.meta->>'game' AS slug, e.amount AS bet
      FROM "LedgerTransaction" t
      JOIN "LedgerEntry" e ON e."transactionId" = t.id
      JOIN "LedgerAccount" a ON a.id = e."accountId"
      WHERE t.type = 'GAME_BET'
        AND a.bucket = 'MAIN'
        AND e.direction = 'DEBIT'
        AND t.meta->>'game' IS NOT NULL
    ),
    win_rows AS (
      SELECT t.meta->>'game' AS slug, e.amount AS win
      FROM "LedgerTransaction" t
      JOIN "LedgerEntry" e ON e."transactionId" = t.id
      JOIN "LedgerAccount" a ON a.id = e."accountId"
      WHERE t.type = 'GAME_WIN'
        AND a.bucket = 'MAIN'
        AND e.direction = 'CREDIT'
        AND t.meta->>'game' IS NOT NULL
    )
    SELECT
      b.slug,
      COUNT(*)::int AS plays,
      COALESCE(SUM(b.bet), 0) AS wagered,
      (SELECT COUNT(*)::int FROM win_rows w WHERE w.slug = b.slug) AS "playerWins",
      (SELECT COALESCE(SUM(w.win), 0) FROM win_rows w WHERE w.slug = b.slug) AS "playerWonAmount"
    FROM bet_rows b
    GROUP BY b.slug
  `

  const map = new Map<string, GameLiveStats>()
  for (const row of rows) {
    const playerLosses = Math.max(0, row.plays - row.playerWins)
    const wagered = BigInt(row.wagered ?? 0)
    const playerWonAmount = BigInt(row.playerWonAmount ?? 0)
    const playerLostAmount =
      row.plays > 0 ? (wagered * BigInt(playerLosses)) / BigInt(row.plays) : 0n
    map.set(row.slug, {
      plays: row.plays,
      wagered,
      playerWins: row.playerWins,
      playerLosses,
      playerWonAmount,
      playerLostAmount,
      houseProfit: wagered - playerWonAmount,
      activeRounds: 0,
    })
  }
  return map
}

/** Active in-progress rounds (mines, chicken-road). */
export async function activeRoundStatsBySlug(): Promise<Map<string, number>> {
  const rows = await prisma.gameRound.groupBy({
    by: ['gameSlug'],
    where: { state: 'ACTIVE' },
    _count: { _all: true },
  })
  const map = new Map<string, number>()
  for (const row of rows) map.set(row.gameSlug, row._count._all)
  return map
}

/** Aggregate real round data per game slug (mines / chicken-road settled rounds). */
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
  const [games, ledgerStats, activeRounds] = await Promise.all([
    prisma.game.findMany({ orderBy: { order: 'asc' } }),
    ledgerStatsBySlug(),
    activeRoundStatsBySlug(),
  ])

  return games.map((g) => {
    const s = ledgerStats.get(g.slug) ?? emptyStats()
    return {
      ...g,
      plays: s.plays,
      wagered: s.wagered,
      playerWins: s.playerWins,
      playerLosses: s.playerLosses,
      playerWonAmount: s.playerWonAmount,
      playerLostAmount: s.playerLostAmount,
      houseProfit: s.houseProfit,
      ggr: s.houseProfit,
      activeRounds: activeRounds.get(g.slug) ?? 0,
    }
  })
}
