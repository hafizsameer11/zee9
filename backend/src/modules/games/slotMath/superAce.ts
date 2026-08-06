import { chance, forcedLossRate, unitRand } from './rtp.js'

/** Target RTP uses loss bias on natural cascade EV (fraction of bet). */
const EV_FALLBACK = 0.92

let cachedEv: number | null = null

function estimateNaturalEv(): number {
  if (cachedEv != null) return cachedEv
  let sum = 0
  const samples = 2000
  for (let i = 0; i < samples; i++) {
    const roll = unitRand()
    if (roll < 0.62) {
      sum += 0
      continue
    }
    const mult = 1.1 + unitRand() * 4.2
    sum += mult
  }
  cachedEv = sum / samples
  if (!Number.isFinite(cachedEv) || cachedEv <= 0) cachedEv = EV_FALLBACK
  return cachedEv
}

export type SuperAceOutcome = {
  winRupees: number
  payload: {
    totalWin: number
    triggerFreeSpins: false
  }
}

export function spinSuperAce(betRupees: number, winPct: number): SuperAceOutcome {
  const q = forcedLossRate(estimateNaturalEv(), winPct)
  if (chance(q)) {
    return {
      winRupees: 0,
      payload: { totalWin: 0, triggerFreeSpins: false },
    }
  }

  const mult = 1.1 + unitRand() * 4.2
  const win = Math.round(betRupees * mult * 100) / 100
  return {
    winRupees: win,
    payload: { totalWin: win, triggerFreeSpins: false },
  }
}
