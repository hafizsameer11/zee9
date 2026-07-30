import type { Server as HttpServer } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { verifyAccess } from '../../lib/jwt.js'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { env } from '../../lib/env.js'
import { toRupees } from '../../lib/money.js'
import { getBalances } from '../../core/ledger.js'
import * as dragonTiger from './dragonTiger.service.js'
import { registerGameWs } from './gameWsRouter.js'
import { dispatchWsAction } from './wsActions.js'

type Client = { ws: WebSocket; userId: string }

let wss: WebSocketServer | null = null
const clients = new Set<Client>()
let tickTimer: ReturnType<typeof setTimeout> | null = null
let ticking = false

function send(ws: WebSocket, payload: unknown) {
  if (ws.readyState !== WebSocket.OPEN) return
  try {
    ws.send(JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

function scheduleNext(ms: number) {
  if (tickTimer) clearTimeout(tickTimer)
  tickTimer = setTimeout(() => {
    void runTick()
  }, ms)
}

async function runTick() {
  if (ticking) {
    scheduleNext(40)
    return
  }
  ticking = true
  try {
    await dragonTiger.tickDragonTiger()
    if (clients.size === 0) return
    const online = clients.size
    for (const client of clients) {
      try {
        const state = await dragonTiger.getState(client.userId, online)
        send(client.ws, { type: 'state', data: state })
      } catch (err) {
        logger.warn({ err, userId: client.userId }, 'DragonTiger state push failed')
      }
    }
  } catch (err) {
    logger.warn({ err }, 'DragonTiger realtime tick failed')
  } finally {
    ticking = false
    scheduleNext(250)
  }
}

export function kickDragonTigerRealtime() {
  if (tickTimer) clearTimeout(tickTimer)
  tickTimer = setTimeout(() => {
    void runTick()
  }, 0)
}

export function attachDragonTigerRealtime(_server: HttpServer) {
  wss = new WebSocketServer({ noServer: true })
  registerGameWs('/games/dragon-tiger/ws', wss)

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
      try {
        const bal = await getBalances(prisma, user.id)
        send(ws, { type: 'hello', data: { balance: toRupees(bal.MAIN ?? 0n) } })
      } catch {
        /* ignore */
      }
      kickDragonTigerRealtime()
      ws.on('close', () => clients.delete(client))
      ws.on('message', (raw) => {
        void (async () => {
          try {
            const msg = JSON.parse(String(raw))
            if (msg?.type === 'ping') {
              send(ws, { type: 'pong' })
              return
            }
            if (msg?.type === 'refresh') {
              kickDragonTigerRealtime()
              return
            }
            await dispatchWsAction(
              ws,
              msg,
              {
                bet: async (m) => dragonTiger.placeBet(client.userId, m.side, m.amount),
              },
              { afterOk: () => kickDragonTigerRealtime() },
            )
          } catch {
            /* ignore */
          }
        })()
      })
    } catch (err) {
      logger.warn({ err }, 'DragonTiger WS connect failed')
      ws.close(4401, 'Unauthorized')
    }
  })

  logger.info({ path: `${env.apiPrefix}/games/dragon-tiger/ws` }, 'DragonTiger WS registered')
  scheduleNext(500)
}

export function stopDragonTigerRealtime() {
  if (tickTimer) clearTimeout(tickTimer)
  tickTimer = null
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
