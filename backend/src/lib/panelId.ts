import { prisma } from './prisma.js'

/** Next sequential C2C merchant panel ID (1, 2, 3…). */
export async function allocatePanelId(): Promise<number> {
  const agg = await prisma.user.aggregate({ _max: { panelId: true } })
  return (agg._max.panelId ?? 0) + 1
}
