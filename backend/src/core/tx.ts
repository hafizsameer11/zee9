import { Prisma } from '@prisma/client'
import { prisma, type Tx } from '../lib/prisma.js'

/**
 * Run a money-critical transaction at SERIALIZABLE isolation, retrying on
 * serialization/write conflicts. All balance-changing work must run inside this.
 */
export async function runMoneyTx<T>(fn: (tx: Tx) => Promise<T>, retries = 3): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (err) {
      lastErr = err
      const code = (err as { code?: string })?.code
      // P2034: transaction conflict / deadlock — safe to retry
      if (code === 'P2034' || code === '40001' || code === '40P01') continue
      throw err
    }
  }
  throw lastErr
}
