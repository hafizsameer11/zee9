import { getAccess } from '../../api/client'

const API_BASE = ((import.meta as any).env?.VITE_API_BASE as string) || 'http://localhost:4000/api/v1'

function wsUrl(pathSuffix: string, token: string): string {
  const http = new URL(API_BASE)
  const wsProto = http.protocol === 'https:' ? 'wss:' : 'ws:'
  const base = http.pathname.replace(/\/$/, '')
  const path = pathSuffix.startsWith('/') ? pathSuffix : `/${pathSuffix}`
  const separator = path.includes('?') ? '&' : '?'
  return `${wsProto}//${http.host}${base}${path}${separator}token=${encodeURIComponent(token)}`
}

export type GameSocketHandlers = {
  onState?: (state: any) => void
  onError?: (message: string) => void
  onStatus?: (status: 'connecting' | 'open' | 'closed') => void
  onEvent?: (type: string, msg: any) => void
}

type Pending = {
  resolve: (data: any) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

let reqSeq = 0

/**
 * Shared realtime game socket with request/response actions.
 * Prefer this over HTTP for all gameplay (bet / spin / cashout / …).
 */
export function createGameSocket(pathSuffix: string, handlers: GameSocketHandlers = {}) {
  let ws: WebSocket | null = null
  let closed = false
  let retryMs = 500
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null
  const pending = new Map<string, Pending>()

  const clearTimers = () => {
    if (retryTimer) clearTimeout(retryTimer)
    if (pingTimer) clearInterval(pingTimer)
    retryTimer = null
    pingTimer = null
  }

  const rejectAll = (reason: string) => {
    for (const [, p] of pending) {
      clearTimeout(p.timer)
      p.reject(new Error(reason))
    }
    pending.clear()
  }

  const waitReady = (timeoutMs = 8000): Promise<void> =>
    new Promise((resolve, reject) => {
      const startedAt = Date.now()
      const check = () => {
        if (closed) {
          reject(new Error('Closed'))
          return
        }
        if (ws?.readyState === WebSocket.OPEN) {
          resolve()
          return
        }
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error('Not connected'))
          return
        }
        setTimeout(check, 50)
      }
      check()
    })

  const connect = () => {
    if (closed) return
    const token = getAccess()
    if (!token) {
      handlers.onError?.('Not authenticated')
      handlers.onStatus?.('closed')
      return
    }

    handlers.onStatus?.('connecting')
    ws = new WebSocket(wsUrl(pathSuffix, token))

    ws.onopen = () => {
      retryMs = 500
      handlers.onStatus?.('open')
      pingTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 15000)
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data))
        if (msg?.type === 'state' && msg.data != null) handlers.onState?.(msg.data)
        if (msg?.type === 'error') handlers.onError?.(msg.message || 'Game error')
        if (msg?.type === 'result' && msg.id != null) {
          const p = pending.get(String(msg.id))
          if (p) {
            pending.delete(String(msg.id))
            clearTimeout(p.timer)
            if (msg.ok) p.resolve(msg.data)
            else p.reject(new Error(msg.error || 'Action failed'))
          }
        }
        if (msg?.type) handlers.onEvent?.(msg.type, msg)
      } catch {
        /* ignore */
      }
    }

    ws.onclose = () => {
      clearTimers()
      rejectAll('Connection closed')
      handlers.onStatus?.('closed')
      if (closed) return
      retryTimer = setTimeout(() => {
        retryMs = Math.min(8000, Math.floor(retryMs * 1.6))
        connect()
      }, retryMs)
    }

    ws.onerror = () => {
      try {
        ws?.close()
      } catch {
        /* ignore */
      }
    }
  }

  connect()

  return {
    async request<T = any>(
      type: string,
      payload: Record<string, unknown> = {},
      timeoutMs = 15000,
    ): Promise<T> {
      await waitReady()
      return new Promise<T>((resolve, reject) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          reject(new Error('Not connected'))
          return
        }
        const id = `r${Date.now()}-${++reqSeq}`
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error('Request timeout'))
        }, timeoutMs)
        pending.set(id, {
          resolve: resolve as (d: any) => void,
          reject,
          timer,
        })
        // Use `action` for the RPC name so payload fields like Wingo/Roulette
        // `type` (bet kind) cannot overwrite it and leave the server silent.
        ws.send(JSON.stringify({ ...payload, action: type, id }))
      })
    },
    send(msg: Record<string, unknown>): boolean {
      if (!ws || ws.readyState !== WebSocket.OPEN) return false
      ws.send(JSON.stringify(msg))
      return true
    },
    refresh() {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'refresh' }))
      }
    },
    ready(): boolean {
      return !!ws && ws.readyState === WebSocket.OPEN
    },
    close() {
      closed = true
      clearTimers()
      rejectAll('Closed')
      try {
        ws?.close()
      } catch {
        /* ignore */
      }
      ws = null
    },
  }
}

export type GameSocket = ReturnType<typeof createGameSocket>
