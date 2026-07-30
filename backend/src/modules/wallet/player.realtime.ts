import type { Server as HttpServer } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { verifyAccess } from '../../lib/jwt.js'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { registerGameWs } from '../games/gameWsRouter.js'
import * as wallet from './wallet.service.js'

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

/** Push a realtime event to one player (all their open tabs). */
export function notifyPlayer(userId: string, payload: unknown) {
  let n = 0
  for (const c of clients) {
    if (c.userId === userId) {
      send(c.ws, payload)
      n++
    }
  }
  return n
}

/** After wallet changes, push fresh MAIN/BONUS (paisa) to the player. */
export async function pushPlayerWallet(userId: string, reason: string) {
  try {
    const bals = await wallet.balances(userId)
    return notifyPlayer(userId, {
      type: 'wallet.updated',
      data: {
        MAIN: Number(bals.MAIN ?? 0n),
        BONUS: Number(bals.BONUS ?? 0n),
        reason,
      },
    })
  } catch (err) {
    logger.warn({ err, userId, reason }, 'Failed to push player wallet update')
    return 0
  }
}

export function attachPlayerRealtime(_server: HttpServer) {
  wss = new WebSocketServer({ noServer: true })
  const path = registerGameWs('/me/ws', wss)

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
      send(ws, { type: 'ready', data: { userId: user.id } })

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(String(raw))
          if (msg?.type === 'ping') send(ws, { type: 'pong' })
        } catch {
          /* ignore */
        }
      })

      ws.on('close', () => clients.delete(client))
      ws.on('error', () => clients.delete(client))
    } catch (err) {
      logger.warn({ err }, 'Player WS connection failed')
      try {
        ws.close(4401, 'Unauthorized')
      } catch {
        /* ignore */
      }
    }
  })

  logger.info({ path }, 'Player wallet realtime WebSocket attached')
}

export function stopPlayerRealtime() {
  for (const c of clients) {
    try {
      c.ws.close()
    } catch {
      /* ignore */
    }
  }
  clients.clear()
  try {
    wss?.close()
  } catch {
    /* ignore */
  }
  wss = null
}
