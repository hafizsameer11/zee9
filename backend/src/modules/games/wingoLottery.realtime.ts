import type { Server as HttpServer } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { verifyAccess } from '../../lib/jwt.js'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { env } from '../../lib/env.js'
import * as lottery from './wingoLottery.service.js'
import { registerGameWs } from './gameWsRouter.js'
import { dispatchWsAction } from './wsActions.js'

type Client = {
  ws: WebSocket
  userId: string
}

type LotteryBetEvent = {
  id: string
  betKey: string
  amount: number
  userId: string
  at?: string
}

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

function broadcast(payload: unknown, exceptUserId?: string) {
  for (const c of clients) {
    if (exceptUserId && c.userId === exceptUserId) continue
    send(c.ws, payload)
  }
}

export function getLotteryOnlineCount() {
  return clients.size
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
    await lottery.tickLottery()
    if (clients.size === 0) return

    const online = clients.size
    for (const client of clients) {
      try {
        const state = await lottery.getState(client.userId, online)
        send(client.ws, { type: 'state', data: state })
      } catch (err) {
        logger.warn({ err, userId: client.userId }, 'Lottery state push failed')
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Lottery realtime tick failed')
  } finally {
    ticking = false
    // UI displays whole seconds and bets trigger an immediate kick. A 500ms
    // idle cadence halves repetitive DB snapshots without reducing bet latency.
    scheduleNext(500)
  }
}

export function kickLotteryRealtime() {
  if (tickTimer) clearTimeout(tickTimer)
  tickTimer = setTimeout(() => {
    void runTick()
  }, 0)
}

/** Instant table event so every seat sees a new chip fly without waiting for the next tick. */
export function broadcastLotteryBet(bet: LotteryBetEvent) {
  const seat = `P${String(
    10000 +
      (bet.userId.charCodeAt(bet.userId.length - 1) || 0) * 97 +
      (bet.userId.charCodeAt(8) || 0),
  ).slice(-5)}`
  broadcast(
    {
      type: 'bet',
      data: {
        id: bet.id,
        betKey: bet.betKey,
        amount: bet.amount,
        at: bet.at ?? new Date().toISOString(),
        seat,
        playersOnline: clients.size,
      },
    },
    bet.userId,
  )
  kickLotteryRealtime()
}

export function attachLotteryRealtime(_server: HttpServer) {
  const path = `${env.apiPrefix}/games/wingo-lottery/ws`
  wss = new WebSocketServer({ noServer: true })
  registerGameWs('/games/wingo-lottery/ws', wss)

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
      logger.info({ userId: user.id, clients: clients.size }, 'Lottery WS connected')
      broadcast({ type: 'presence', data: { playersOnline: clients.size } })

      try {
        const state = await lottery.getState(user.id, clients.size)
        send(ws, { type: 'state', data: state })
      } catch (err) {
        logger.warn({ err }, 'Lottery WS initial state failed')
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
              kickLotteryRealtime()
              return
            }
            await dispatchWsAction(
              ws,
              msg,
              {
                bet: async (m) => {
                  const data = await lottery.placeBet(client.userId, m.type, m.amount, m.value)
                  broadcastLotteryBet({
                    id: data.betId,
                    betKey: data.betKey,
                    amount: data.amount,
                    userId: client.userId,
                    at: data.at,
                  })
                  return data
                },
              },
              { afterOk: () => kickLotteryRealtime() },
            )
          } catch {
            /* ignore */
          }
        })()
      })

      ws.on('close', () => {
        clients.delete(client)
        broadcast({ type: 'presence', data: { playersOnline: clients.size } })
      })

      ws.on('error', () => {
        clients.delete(client)
      })
    } catch {
      send(ws, { type: 'error', message: 'Invalid token' })
      ws.close(4401, 'Unauthorized')
    }
  })

  scheduleNext(100)
  logger.info({ path }, 'WinGo Lottery realtime WebSocket attached')
}

export function stopLotteryRealtime() {
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
