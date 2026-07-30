import type { Server as HttpServer } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { verifyAccess } from '../../lib/jwt.js'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { env } from '../../lib/env.js'
import { toRupees } from '../../lib/money.js'
import { getBalances } from '../../core/ledger.js'
import * as slot from './slot.service.js'
import { SLOT_SLUGS } from './slot.service.js'
import { registerGameWs } from './gameWsRouter.js'
import { dispatchWsAction } from './wsActions.js'

type Client = { ws: WebSocket; userId: string; slug: string }

const servers = new Map<string, WebSocketServer>()
const clients = new Set<Client>()

function send(ws: WebSocket, payload: unknown) {
  if (ws.readyState !== WebSocket.OPEN) return
  try {
    ws.send(JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

function attachSlug(slug: string) {
  const wss = new WebSocketServer({ noServer: true })
  registerGameWs(`/games/${slug}/ws`, wss)
  servers.set(slug, wss)

  wss.on('connection', async (ws, req) => {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
      const token = url.searchParams.get('token') || ''
      if (!token) {
        send(ws, { type: 'error', message: 'Missing token' })
        ws.close(4401, 'Unauthorized')
        return
      }

      const payload = verifyAccess(token)
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, status: true },
      })
      if (!user || user.status === 'BANNED') {
        send(ws, { type: 'error', message: 'Unauthorized' })
        ws.close(4401, 'Unauthorized')
        return
      }

      const client: Client = { ws, userId: user.id, slug }
      clients.add(client)
      logger.info({ userId: user.id, slug, clients: clients.size }, 'Slot WS connected')

      try {
        const bal = await getBalances(prisma, user.id)
        send(ws, { type: 'hello', data: { balance: toRupees(bal.MAIN ?? 0n), slug } })
      } catch {
        /* ignore */
      }

      ws.on('message', (raw) => {
        void (async () => {
          try {
            const msg = JSON.parse(String(raw))
            if (msg?.type === 'ping') {
              send(ws, { type: 'pong', t: Date.now() })
              return
            }
            await dispatchWsAction(ws, msg, {
              spin: async (m) => slot.spin(client.userId, slug, m.bet),
            })
          } catch {
            /* ignore */
          }
        })()
      })

      ws.on('close', () => {
        clients.delete(client)
      })

      ws.on('error', () => {
        clients.delete(client)
      })
    } catch {
      send(ws, { type: 'error', message: 'Invalid token' })
      ws.close(4401, 'Unauthorized')
    }
  })
}

export function attachSlotRealtime(_server: HttpServer) {
  for (const slug of SLOT_SLUGS) {
    attachSlug(slug)
  }
  logger.info(
    { paths: SLOT_SLUGS.map((s) => `${env.apiPrefix}/games/${s}/ws`) },
    'Slot realtime WebSockets attached',
  )
}

export function stopSlotRealtime() {
  for (const c of clients) {
    try {
      c.ws.close()
    } catch {
      /* ignore */
    }
  }
  clients.clear()
  for (const wss of servers.values()) {
    try {
      wss.close()
    } catch {
      /* ignore */
    }
  }
  servers.clear()
}
