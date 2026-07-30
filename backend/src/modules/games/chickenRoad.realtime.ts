import type { Server as HttpServer } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { verifyAccess } from '../../lib/jwt.js'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { env } from '../../lib/env.js'
import { toRupees } from '../../lib/money.js'
import { getBalances } from '../../core/ledger.js'
import * as chickenRoad from './chickenRoad.service.js'
import { registerGameWs } from './gameWsRouter.js'
import { dispatchWsAction } from './wsActions.js'

type Client = {
  ws: WebSocket
  userId: string
}

let wss: WebSocketServer | null = null
const clients = new Set<Client>()

function send(ws: WebSocket, payload: unknown) {
  if (ws.readyState !== WebSocket.OPEN) return
  try {
    ws.send(JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export function attachChickenRoadRealtime(_server: HttpServer) {
  const path = `${env.apiPrefix}/games/chicken-road/ws`
  wss = new WebSocketServer({ noServer: true })
  registerGameWs('/games/chicken-road/ws', wss)

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

      const client: Client = { ws, userId: user.id }
      clients.add(client)
      logger.info({ userId: user.id, clients: clients.size }, 'ChickenRoad WS connected')

      try {
        const bal = await getBalances(prisma, user.id)
        send(ws, { type: 'hello', data: { balance: toRupees(bal.MAIN ?? 0n) } })
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
              start: async (m) => chickenRoad.start(client.userId, m.bet, m.difficulty),
              step: async (m) =>
                chickenRoad.step(client.userId, m.roundId, Number(m.currentStep ?? NaN)),
              cashout: async (m) => chickenRoad.cashout(client.userId, m.roundId),
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

  logger.info({ path }, 'ChickenRoad realtime WebSocket attached')
}

export function stopChickenRoadRealtime() {
  for (const c of clients) {
    try {
      c.ws.close()
    } catch {
      /* ignore */
    }
  }
  clients.clear()
  wss?.close()
  wss = null
}
