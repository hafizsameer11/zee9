import type { Server as HttpServer } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { verifyAccess } from '../../lib/jwt.js'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { registerGameWs } from '../games/gameWsRouter.js'

type Client = {
  ws: WebSocket
  agentId: string
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

/** Push a realtime event to one C2C merchant (all their open tabs). */
export function notifyMerchant(agentId: string, payload: unknown) {
  let n = 0
  for (const c of clients) {
    if (c.agentId === agentId) {
      send(c.ws, payload)
      n++
    }
  }
  return n
}

export type MerchantDepositEvent = {
  type: 'deposit_new' | 'deposit_submitted' | 'deposit_resolved'
  title: string
  body: string
  orderId: string
  orderNo: string
  amount: number
  method: string
  collectionAccount: string | null
  trxId?: string | null
  playerName?: string | null
  status?: 'SUCCESS' | 'FAIL'
}

export type MerchantWithdrawEvent = {
  type: 'withdraw_new'
  withdrawalId: string
  amount: number
  method: string
  playerName?: string | null
  title: string
  body: string
}

export type MerchantRealtimeEvent = MerchantDepositEvent | MerchantWithdrawEvent

export function pushDepositToMerchant(agentId: string, event: MerchantDepositEvent) {
  return notifyMerchant(agentId, { type: event.type, data: event })
}

/** New player withdrawal in the C2C pool — all online merchants can claim. */
export function broadcastWithdrawAvailable(event: Omit<MerchantWithdrawEvent, 'type'>) {
  const payload = { type: 'withdraw_new', data: { ...event, type: 'withdraw_new' as const } }
  let n = 0
  for (const c of clients) {
    send(c.ws, payload)
    n++
  }
  return n
}

/** Tell merchant tabs to stop alerting for this order (confirmed / rejected / expired). */
export function pushDepositResolvedToMerchant(
  agentId: string,
  order: { id: string; orderNo: string; status: 'SUCCESS' | 'FAIL' },
) {
  return notifyMerchant(agentId, {
    type: 'deposit_resolved',
    data: {
      type: 'deposit_resolved',
      title: order.status === 'SUCCESS' ? 'Deposit confirmed' : 'Deposit closed',
      body: `Order ${order.orderNo} is ${order.status === 'SUCCESS' ? 'complete' : 'closed'}.`,
      orderId: order.id,
      orderNo: order.orderNo,
      amount: 0,
      method: '',
      collectionAccount: null,
      status: order.status,
    },
  })
}

export function attachAgentRealtime(_server: HttpServer) {
  wss = new WebSocketServer({ noServer: true })
  const path = registerGameWs('/agent/ws', wss)

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
        select: { id: true, role: true, status: true, panelId: true },
      })
      if (!user || user.status === 'BANNED' || user.role !== 'AGENT' || user.panelId == null) {
        send(ws, { type: 'error', message: 'Unauthorized' })
        ws.close(4401, 'Unauthorized')
        return
      }

      const client: Client = { ws, agentId: user.id }
      clients.add(client)
      send(ws, { type: 'ready', data: { agentId: user.id } })

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
      logger.warn({ err }, 'Agent WS connection failed')
      try {
        ws.close(4401, 'Unauthorized')
      } catch {
        /* ignore */
      }
    }
  })

  logger.info({ path }, 'C2C merchant realtime WebSocket attached')
}

export function stopAgentRealtime() {
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
