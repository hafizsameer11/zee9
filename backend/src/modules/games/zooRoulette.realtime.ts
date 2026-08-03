import type { Server as HttpServer } from 'node:http'
import { WebSocket, WebSocketServer } from 'ws'
import { verifyAccess } from '../../lib/jwt.js'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import * as zooRoulette from './zooRoulette.service.js'
import { registerGameWs } from './gameWsRouter.js'
import { dispatchWsAction, sendJson } from './wsActions.js'

type Client = { ws: WebSocket; userId: string }

let wss: WebSocketServer | null = null
const clients = new Set<Client>()
let tickTimer: ReturnType<typeof setTimeout> | null = null
let ticking = false

function broadcast(payload: unknown, exceptUserId?: string) {
  for (const client of clients) {
    if (client.userId !== exceptUserId) sendJson(client.ws, payload)
  }
}

function schedule(ms: number) {
  if (tickTimer) clearTimeout(tickTimer)
  tickTimer = setTimeout(() => void runTick(), ms)
}

async function runTick() {
  if (ticking) {
    schedule(50)
    return
  }
  ticking = true
  try {
    await zooRoulette.tickZooRoulette()
    if (clients.size > 0) {
      for (const client of clients) {
        try {
          const state = await zooRoulette.getState(client.userId, clients.size)
          sendJson(client.ws, { type: 'state', data: state })
        } catch (err) {
          logger.warn({ err, userId: client.userId }, 'Zoo Roulette state push failed')
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Zoo Roulette realtime tick failed')
  } finally {
    ticking = false
    schedule(250)
  }
}

export function kickZooRouletteRealtime() {
  schedule(0)
}

function broadcastBet(bet: {
  betId: string
  zone: string
  amount: number
  at: string
  userId: string
}) {
  broadcast(
    {
      type: 'bet',
      data: {
        id: bet.betId,
        zone: bet.zone,
        amount: bet.amount,
        at: bet.at,
        playersOnline: clients.size,
      },
    },
    bet.userId,
  )
}

export function attachZooRouletteRealtime(_server: HttpServer) {
  wss = new WebSocketServer({ noServer: true })
  const path = registerGameWs('/games/zoo-roulette/ws', wss)

  wss.on('connection', async (ws, req) => {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
      const token = url.searchParams.get('token') || ''
      if (!token) {
        sendJson(ws, { type: 'error', message: 'Missing token' })
        ws.close(4401, 'Unauthorized')
        return
      }

      const payload = verifyAccess(token)
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, status: true },
      })
      if (!user || user.status === 'BANNED') {
        sendJson(ws, { type: 'error', message: 'Unauthorized' })
        ws.close(4401, 'Unauthorized')
        return
      }

      const client = { ws, userId: user.id }
      clients.add(client)
      logger.info({ userId: user.id, clients: clients.size }, 'Zoo Roulette WS connected')
      broadcast({ type: 'presence', data: { playersOnline: clients.size } })

      sendJson(ws, {
        type: 'state',
        data: await zooRoulette.getState(user.id, clients.size),
      })

      ws.on('message', (raw) => {
        void (async () => {
          try {
            const msg = JSON.parse(String(raw))
            if (msg?.type === 'ping') {
              sendJson(ws, { type: 'pong', t: Date.now() })
              return
            }
            if (msg?.type === 'refresh') {
              kickZooRouletteRealtime()
              return
            }
            await dispatchWsAction(
              ws,
              msg,
              {
                bet: async (m) => {
                  const data = await zooRoulette.placeBet(client.userId, m.zone, Number(m.amount))
                  broadcastBet({ ...data, userId: client.userId })
                  return data
                },
                rebet: async () => zooRoulette.rebet(client.userId),
              },
              { afterOk: kickZooRouletteRealtime },
            )
          } catch (err) {
            logger.debug({ err, userId: client.userId }, 'Zoo Roulette message rejected')
          }
        })()
      })

      ws.on('close', () => {
        clients.delete(client)
        broadcast({ type: 'presence', data: { playersOnline: clients.size } })
      })
      ws.on('error', () => clients.delete(client))
    } catch {
      sendJson(ws, { type: 'error', message: 'Invalid token' })
      ws.close(4401, 'Unauthorized')
    }
  })

  schedule(100)
  logger.info({ path }, 'Zoo Roulette realtime WebSocket attached')
}

export function stopZooRouletteRealtime() {
  if (tickTimer) clearTimeout(tickTimer)
  tickTimer = null
  for (const client of clients) {
    try {
      client.ws.close()
    } catch {
      /* ignore */
    }
  }
  clients.clear()
  wss?.close()
  wss = null
}
