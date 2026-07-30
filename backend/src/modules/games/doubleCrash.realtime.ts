import type { Server as HttpServer } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { verifyAccess } from '../../lib/jwt.js'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { env } from '../../lib/env.js'
import * as doubleCrash from './doubleCrash.service.js'
import { registerGameWs } from './gameWsRouter.js'
import { dispatchWsAction } from './wsActions.js'

type Client = {
  ws: WebSocket
  userId: string
}

let wss: WebSocketServer | null = null
const clients = new Set<Client>()
let tickTimer: ReturnType<typeof setTimeout> | null = null
let ticking = false
let lastPhase: string | null = null

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

function intervalForPhase(phase: string | null): number {
  if (phase === 'flying') return 80
  if (phase === 'crashed') return 200
  return 250
}

async function runTick() {
  if (ticking) {
    scheduleNext(40)
    return
  }
  ticking = true
  try {
    await doubleCrash.processAllAutoCashouts()
    const snap = await doubleCrash.getRoundSnapshot()
    lastPhase = snap.phase

    if (clients.size === 0) return

    for (const client of clients) {
      send(client.ws, {
        type: 'state',
        data: doubleCrash.personalizeSnapshot(snap, client.userId),
      })
    }
  } catch (err) {
    logger.warn({ err }, 'DoubleCrash realtime tick failed')
  } finally {
    ticking = false
    scheduleNext(intervalForPhase(lastPhase))
  }
}

/** Force an immediate broadcast (after bet / cashout). */
export function kickDoubleCrashRealtime() {
  if (tickTimer) clearTimeout(tickTimer)
  tickTimer = setTimeout(() => {
    void runTick()
  }, 0)
}

export function attachDoubleCrashRealtime(_server: HttpServer) {
  const path = `${env.apiPrefix}/games/double-crash/ws`
  wss = new WebSocketServer({ noServer: true })
  registerGameWs('/games/double-crash/ws', wss)

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
      logger.info({ userId: user.id, clients: clients.size }, 'DoubleCrash WS connected')

      try {
        await doubleCrash.processAutoCashouts(user.id)
        const state = await doubleCrash.getState(user.id)
        send(ws, { type: 'state', data: state })
      } catch (err) {
        logger.warn({ err }, 'DoubleCrash WS initial state failed')
      }

      ws.on('message', (raw) => {
        void (async () => {
          try {
            const msg = JSON.parse(String(raw))
            if (msg?.type === 'ping') {
              send(ws, { type: 'pong', t: Date.now() })
              return
            }
            if (msg?.type === 'refresh') {
              kickDoubleCrashRealtime()
              return
            }
            await dispatchWsAction(
              ws,
              msg,
              {
                bet: async (m) =>
                  doubleCrash.placeBet(client.userId, m.amount, m.slot ?? 0, m.autoAt),
                cashout: async (m) => doubleCrash.cashOut(client.userId, m.betId),
              },
              { afterOk: () => kickDoubleCrashRealtime() },
            )
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

  // Always tick so rounds advance even with zero clients
  scheduleNext(100)
  logger.info({ path }, 'DoubleCrash realtime WebSocket attached')
}

export function stopDoubleCrashRealtime() {
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
