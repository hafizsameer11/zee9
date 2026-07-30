import type { Tx } from './prisma.js'
import { prisma } from './prisma.js'
import { randomPlayerNo } from './hash.js'

/** Allocate a unique numeric playerNo (retries on rare collisions). */
export async function allocatePlayerNo(tx?: Tx): Promise<number> {
  const db = tx ?? prisma
  for (let i = 0; i < 40; i++) {
    const n = randomPlayerNo()
    const exists = await db.user.findUnique({ where: { playerNo: n }, select: { id: true } })
    if (!exists) return n
  }
  // Fallback: max + random offset
  const agg = await db.user.aggregate({ _max: { playerNo: true } })
  return (agg._max.playerNo ?? 1_000_000) + 1 + Math.floor(Math.random() * 1000)
}
