/** Shared win/loss toast and status text for round outcomes. */

export function formatRoundAmount(n: number): string {
  return Math.round(n).toLocaleString()
}

export function roundWinMessage(amount: number, detail?: string): string {
  const base = `Won Rs ${formatRoundAmount(amount)}!`
  return detail ? `${base} (${detail})` : base
}

export function roundYouWonMessage(amount: number, detail?: string): string {
  const base = `You won ${formatRoundAmount(amount)}!`
  return detail ? `${base} (${detail})` : base
}

export function roundLossMessage(staked: number): string {
  return `Lost Rs ${formatRoundAmount(staked)}`
}

export function roundLossStatus(staked: number): string {
  return roundLossMessage(staked)
}

export type RoundOutcome = { payout: number; staked: number }

export function sumBetAmounts(
  bets: Array<{ amount: number }> | undefined | null,
): number {
  return (bets ?? []).reduce((sum, b) => sum + (Number(b.amount) || 0), 0)
}
