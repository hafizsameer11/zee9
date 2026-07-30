import { logger } from '../../lib/logger.js'
import { sweepPayoutHolds } from '../withdrawals/payouts.service.js'

const SWEEP_MS = 20_000

export async function runPayoutHoldSweep() {
  try {
    const results = await sweepPayoutHolds()
    const ok = results.filter((r) => r.ok)
    if (ok.length) {
      logger.info({ count: ok.length, orders: ok.map((r) => r.orderNo) }, 'C2C payout holds released (Success + MAIN credit)')
    }
  } catch (err) {
    logger.warn({ err }, 'Payout hold sweep failed')
  }
}

let timer: ReturnType<typeof setInterval> | null = null

export function startPayoutHoldSweeper() {
  if (timer) return
  void runPayoutHoldSweep()
  timer = setInterval(() => {
    void runPayoutHoldSweep()
  }, SWEEP_MS)
  logger.info('C2C payout hold sweeper started (5m Onhold → Success)')
}

export function stopPayoutHoldSweeper() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
