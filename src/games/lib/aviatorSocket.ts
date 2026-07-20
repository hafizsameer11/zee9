import { getAccess } from '../../api/client'

const API_BASE = ((import.meta as any).env?.VITE_API_BASE as string) || 'http://localhost:4000/api/v1'

export type AviatorStateMessage = {
  type: 'state'
  data: any
}

function wsUrlForToken(token: string): string {
  const http = new URL(API_BASE)
  const wsProto = http.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${wsProto}//${http.host}${http.pathname.replace(/\/$/, '')}/games/aviator/ws?token=${encodeURIComponent(token)}`
}

export type AviatorSocketHandlers = {
  onState: (state: any) => void
  onError?: (message: string) => void
  onStatus?: (status: 'connecting' | 'open' | 'closed') => void
}

/**
 * Persistent Aviator WebSocket with auto-reconnect.
 * Bet / cashout stay on HTTP; this channel pushes phase + live bets.
 */
export function connectAviatorSocket(handlers: AviatorSocketHandlers) {
  let ws: WebSocket | null = null
  let closed = false
  let retryMs = 500
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null

  const clearTimers = () => {
    if (retryTimer) clearTimeout(retryTimer)
    if (pingTimer) clearInterval(pingTimer)
    retryTimer = null
    pingTimer = null
  }

  const connect = () => {
    if (closed) return
    const token = getAccess()
    if (!token) {
      handlers.onError?.('Not authenticated')
      handlers.onStatus?.('closed')
      return
    }

    handlers.onStatus?.('connecting')
    const url = wsUrlForToken(token)
    ws = new WebSocket(url)

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
        if (msg?.type === 'state' && msg.data) handlers.onState(msg.data)
        if (msg?.type === 'error') handlers.onError?.(msg.message || 'Aviator error')
      } catch {
        /* ignore */
      }
    }

    ws.onclose = () => {
      clearTimers()
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
    refresh() {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'refresh' }))
      }
    },
    close() {
      closed = true
      clearTimers()
      try {
        ws?.close()
      } catch {
        /* ignore */
      }
      ws = null
    },
  }
}
