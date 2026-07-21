import type { Server as HttpServer, IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import { WebSocketServer } from 'ws'
import { env } from '../../lib/env.js'
import { logger } from '../../lib/logger.js'

type Handler = {
  path: string
  wss: WebSocketServer
}

const handlers: Handler[] = []
let listening = false

/** Register a noServer WSS on a path; shared upgrade router avoids multi-WSS conflicts. */
export function registerGameWs(pathSuffix: string, wss: WebSocketServer) {
  const path = `${env.apiPrefix}${pathSuffix}`
  handlers.push({ path, wss })
  return path
}

export function attachGameWsUpgrade(server: HttpServer) {
  if (listening) return
  listening = true

  server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
      const hit = handlers.find((h) => h.path === url.pathname)
      if (!hit) {
        socket.destroy()
        return
      }
      hit.wss.handleUpgrade(req, socket, head, (ws) => {
        hit.wss.emit('connection', ws, req)
      })
    } catch (err) {
      logger.warn({ err }, 'WS upgrade failed')
      socket.destroy()
    }
  })

  logger.info(
    { paths: handlers.map((h) => h.path) },
    'Game WebSocket upgrade router attached',
  )
}
