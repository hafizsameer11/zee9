import type { Tx } from '../lib/prisma.js'
import { prisma } from '../lib/prisma.js'

/** Create a player notification. Pass a tx to include it in a money transaction. */
export async function notify(
  client: Tx | typeof prisma,
  userId: string,
  kind: string,
  title: string,
  body: string,
) {
  await client.notification.create({ data: { userId, kind, title, body } })
}
