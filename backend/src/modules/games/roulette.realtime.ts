import type { Server as HttpServer } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { verifyAccess } from '../../lib/jwt.js'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { env } from '../../lib/env.js'
import { toRupees } from '../../lib/money.js'
import { getBalances } from '../../core/ledger.js'
import * as roulette from './roulette.service.js'
import { registerGameWs } from './gameWsRouter.js'
import { dispatchWsAction } from './wsActions.js'

type Client = {
  ws: WebSocket
  userId: string
  name: string
  seat: string
  avatar: number
  balance: number
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

function seatLabel(userId: string) {
  return `P${String(10000 + (userId.charCodeAt(userId.length - 1) || 0) * 97 + (userId.charCodeAt(8) || 0)).slice(-5)}`
}

function avatarFromUserId(userId: string) {
  let h = 0
  for (let i = 0; i < userId.length; i++) h = (h + userId.charCodeAt(i) * (i + 3)) % 6
  return h + 1
}

function buildSeats(exceptUserId?: string) {
  const list = [...clients]
    .filter((c) => c.userId !== exceptUserId)
    .slice(0, 6)
    .map((c) => ({
      id: c.userId,
      name: c.name,
      seat: c.seat,
      avatar: c.avatar,
      balance: c.balance,
    }))
  return list
}

export function getRouletteOnlineCount() {
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
    await roulette.tickRoulette()
    if (clients.size === 0) return

    const online = clients.size
    for (const client of clients) {
      try {
        const seats = buildSeats(client.userId)
        const state = await roulette.getState(client.userId, online, seats)
        send(client.ws, { type: 'state', data: state })
      } catch (err) {
        logger.warn({ err, userId: client.userId }, 'Roulette state push failed')
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Roulette realtime tick failed')
  } finally {
    ticking = false
    scheduleNext(250)
  }
}

export function kickRouletteRealtime() {
  if (tickTimer) clearTimeout(tickTimer)
  tickTimer = setTimeout(() => {
    void runTick()
  }, 0)
}

export function broadcastRouletteBet(bet: {
  id: string
  betKey: string
  amount: number
  userId: string
  at?: string
}) {
  const seat = seatLabel(bet.userId)
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
  kickRouletteRealtime()
}

export function attachRouletteRealtime(_server: HttpServer) {
  const path = `${env.apiPrefix}/games/roulette/ws`
  wss = new WebSocketServer({ noServer: true })
  registerGameWs('/games/roulette/ws', wss)

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
        select: { id: true, status: true, displayName: true, playerNo: true },
      })
      if (!user || user.status === 'BANNED') {
        send(ws, { type: 'error', message: 'Unauthorized' })
        ws.close(4401, 'Unauthorized')
        return
      }

      let balance = 0
      try {
        const bal = await getBalances(prisma, user.id)
        balance = toRupees(bal.MAIN ?? 0n)
      } catch {
        balance = 0
      }

      const client: Client = {
        ws,
        userId: user.id,
        name: user.displayName || `P${user.playerNo}`,
        seat: seatLabel(user.id),
        avatar: avatarFromUserId(user.id),
        balance,
      }
      clients.add(client)
      logger.info({ userId: user.id, clients: clients.size }, 'Roulette WS connected')
      broadcast({ type: 'presence', data: { playersOnline: clients.size } })

      try {
        const state = await roulette.getState(user.id, clients.size, buildSeats(user.id))
        send(ws, { type: 'state', data: state })
      } catch (err) {
        logger.warn({ err }, 'Roulette WS initial state failed')
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
              kickRouletteRealtime()
              return
            }
            await dispatchWsAction(
              ws,
              msg,
              {
                bet: async (m) => {
                  const data = await roulette.placeBet(
                    client.userId,
                    m.type,
                    m.amount,
                    m.value,
                    m.cellKey,
                  )
                  broadcastRouletteBet({
                    id: data.betId,
                    betKey: data.betKey,
                    amount: data.amount,
                    userId: client.userId,
                    at: data.at,
                  })
                  return data
                },
                revoke: async (m) => roulette.revokeBets(client.userId, m.mode ?? 'all'),
              },
              { afterOk: () => kickRouletteRealtime() },
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
  logger.info({ path }, 'Roulette realtime WebSocket attached')
}

export function stopRouletteRealtime() {
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
