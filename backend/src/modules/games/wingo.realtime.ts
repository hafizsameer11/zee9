import type { Server as HttpServer } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { verifyAccess } from '../../lib/jwt.js'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { env } from '../../lib/env.js'
import * as wingo from './wingo.service.js'
import { registerGameWs } from './gameWsRouter.js'

type Client = {
  ws: WebSocket
  userId: string
  mode: wingo.WingoMode
  /** Round the client last received, used to skip repeat history queries. */
  lastRoundId: string | null
  lastPayload: string | null
  lastSentAt: number
}

/** Clock resync interval when nothing else about the round changed. */
const RESYNC_MS = 2_000

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

async function pushState(client: Client, base: Awaited<ReturnType<typeof wingo.getModeState>>) {
  const roundChanged = client.lastRoundId !== base.roundId
  const mine = await wingo.getUserState(client.userId, base.roundId, base.mode, roundChanged)

  // The client runs the countdown itself off `msLeft` + its own clock, so a
  // payload whose only difference is the remaining time carries no new
  // information — resend it just often enough to correct drift.
  const payload = { ...base, ...mine }
  const { msLeft: _ms, phaseMsLeft: _phaseMs, ...stable } = payload
  const signature = JSON.stringify(stable)
  const now = Date.now()
  if (!roundChanged && signature === client.lastPayload && now - client.lastSentAt < RESYNC_MS) {
    return
  }

  client.lastRoundId = base.roundId
  client.lastPayload = signature
  client.lastSentAt = now
  send(client.ws, { type: 'state', data: { ...payload, serverTime: new Date().toISOString() } })
}

async function runTick() {
  if (ticking) {
    scheduleNext(40)
    return
  }
  ticking = true
  try {
    if (clients.size === 0) {
      await wingo.tickAllModes()
      return
    }

    // Group by mode: round + history are identical for everyone on that mode.
    const byMode = new Map<wingo.WingoMode, Client[]>()
    for (const c of clients) {
      const list = byMode.get(c.mode) ?? []
      list.push(c)
      byMode.set(c.mode, list)
    }

    // Modes nobody is watching still need their rounds advanced.
    for (const mode of wingo.WINGO_MODES) {
      if (!byMode.has(mode)) await wingo.tickMode(mode)
    }

    for (const [mode, modeClients] of byMode) {
      let base: Awaited<ReturnType<typeof wingo.getModeState>>
      try {
        base = await wingo.getModeState(mode)
      } catch (err) {
        logger.warn({ err, mode }, 'WinGo mode state failed')
        continue
      }
      for (const client of modeClients) {
        try {
          await pushState(client, base)
        } catch (err) {
          logger.warn({ err, userId: client.userId, mode }, 'WinGo state push failed')
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, 'WinGo realtime tick failed')
  } finally {
    ticking = false
    scheduleNext(500)
  }
}

/** Force an immediate broadcast (after bet / revoke). */
export function kickWingoRealtime(_mode?: string) {
  if (tickTimer) clearTimeout(tickTimer)
  tickTimer = setTimeout(() => {
    void runTick()
  }, 0)
}

export function attachWingoRealtime(_server: HttpServer) {
  const path = `${env.apiPrefix}/games/wingo/ws`
  wss = new WebSocketServer({ noServer: true })
  registerGameWs('/games/wingo/ws', wss)

  wss.on('connection', async (ws, req) => {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
      const token = url.searchParams.get('token') || ''
      const modeParam = url.searchParams.get('mode') || '30s'
      if (!token) {
        send(ws, { type: 'error', message: 'Missing token' })
        ws.close(4401, 'Unauthorized')
        return
      }
      if (!(wingo.WINGO_MODES as readonly string[]).includes(modeParam)) {
        send(ws, { type: 'error', message: 'Invalid mode' })
        ws.close(4400, 'Bad mode')
        return
      }
      const mode = modeParam as wingo.WingoMode

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

      const client: Client = {
        ws,
        userId: user.id,
        mode,
        lastRoundId: null,
        lastPayload: null,
        lastSentAt: 0,
      }
      clients.add(client)
      logger.info({ userId: user.id, mode, clients: clients.size }, 'WinGo WS connected')

      try {
        const state = await wingo.getState(user.id, mode)
        client.lastRoundId = state.roundId
        client.lastSentAt = Date.now()
        send(ws, { type: 'state', data: state })
      } catch (err) {
        logger.warn({ err }, 'WinGo WS initial state failed')
      }

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(String(raw))
          if (msg?.type === 'ping') send(ws, { type: 'pong', t: Date.now() })
          if (msg?.type === 'refresh') {
            client.lastPayload = null
            kickWingoRealtime(client.mode)
          }
          if (msg?.type === 'mode' && typeof msg.mode === 'string') {
            if ((wingo.WINGO_MODES as readonly string[]).includes(msg.mode)) {
              client.mode = msg.mode as wingo.WingoMode
              client.lastRoundId = null
              client.lastPayload = null
              void wingo.getState(client.userId, client.mode).then((state) => {
                client.lastRoundId = state.roundId
                client.lastSentAt = Date.now()
                send(ws, { type: 'state', data: state })
              })
            }
          }
        } catch {
          /* ignore */
        }
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

  scheduleNext(100)
  logger.info({ path }, 'WinGo realtime WebSocket attached')
}

export function stopWingoRealtime() {
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
