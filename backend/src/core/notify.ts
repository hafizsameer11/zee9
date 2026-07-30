import type { Tx } from '../lib/prisma.js'
import { prisma } from '../lib/prisma.js'
import { queueNotificationPush } from './walletPush.js'
import { notifyPlayer } from '../modules/wallet/player.realtime.js'

/** Create a player notification. Pass a tx to include it in a money transaction. */
export async function notify(
  client: Tx | typeof prisma,
  userId: string,
  kind: string,
  title: string,
  body: string,
) {
  const row = await client.notification.create({
    data: { userId, kind, title, body },
    select: { id: true, kind: true, title: true, body: true, createdAt: true },
  })
  const pending = {
    userId,
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  }
  // Inside runMoneyTx: queue until commit. Outside: push immediately.
  if (!queueNotificationPush(pending)) {
    notifyPlayer(userId, {
      type: 'notification.created',
      data: { ...pending, read: false },
    })
  }
}
