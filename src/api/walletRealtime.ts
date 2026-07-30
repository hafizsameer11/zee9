import { useEffect, useRef } from 'react'
import { getAccess } from './client'

const API_BASE = ((import.meta as any).env?.VITE_API_BASE as string) || 'http://localhost:4000/api/v1'

export type WalletUpdatedEvent = {
  MAIN: number
  BONUS: number
  reason?: string
}

export type NotificationCreatedEvent = {
  id: string
  kind: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

export type PlayerRealtimeHandlers = {
  onWalletUpdated?: (ev: WalletUpdatedEvent) => void
  onNotificationCreated?: (ev: NotificationCreatedEvent) => void
  onWithdrawUpdated?: (ev: Record<string, unknown>) => void
  onDepositUpdated?: (ev: Record<string, unknown>) => void
}

function wsUrl(token: string) {
  const base = API_BASE.replace(/\/$/, '')
  const u = new URL(base.replace(/^http/, 'ws') + '/me/ws')
  u.searchParams.set('token', token)
  return u.toString()
}

/** Live wallet + account updates without page refresh. */
export function usePlayerWalletRealtime(
  enabled: boolean,
  onWalletUpdated: (ev: WalletUpdatedEvent) => void,
  extra?: Omit<PlayerRealtimeHandlers, 'onWalletUpdated'>,
) {
  const onRef = useRef(onWalletUpdated)
  onRef.current = onWalletUpdated
  const extraRef = useRef(extra)
  extraRef.current = extra

  useEffect(() => {
    if (!enabled) return
    const token = getAccess()
    if (!token) return

    let closed = false
    let ws: WebSocket | null = null
    let retryTimer: number | null = null
    let pingTimer: number | null = null
    let attempt = 0

    function connect() {
      if (closed) return
      const t = getAccess()
      if (!t) return
      try {
        ws = new WebSocket(wsUrl(t))
      } catch {
        scheduleRetry()
        return
      }

      ws.onopen = () => {
        attempt = 0
        if (pingTimer) window.clearInterval(pingTimer)
        pingTimer = window.setInterval(() => {
          try {
            ws?.send(JSON.stringify({ type: 'ping' }))
          } catch {
            /* ignore */
          }
        }, 25000)
      }

      ws.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(String(msg.data))
          if (parsed?.type === 'wallet.updated' && parsed.data) {
            onRef.current(parsed.data as WalletUpdatedEvent)
            window.dispatchEvent(new CustomEvent('zee9:wallet', { detail: parsed.data }))
          } else if (parsed?.type === 'notification.created' && parsed.data) {
            extraRef.current?.onNotificationCreated?.(parsed.data as NotificationCreatedEvent)
            window.dispatchEvent(new CustomEvent('zee9:notification', { detail: parsed.data }))
          } else if (parsed?.type === 'withdraw.updated' && parsed.data) {
            extraRef.current?.onWithdrawUpdated?.(parsed.data)
            window.dispatchEvent(new CustomEvent('zee9:withdraw', { detail: parsed.data }))
          } else if (parsed?.type === 'deposit.updated' && parsed.data) {
            extraRef.current?.onDepositUpdated?.(parsed.data)
            window.dispatchEvent(new CustomEvent('zee9:deposit', { detail: parsed.data }))
          }
        } catch {
          /* ignore */
        }
      }

      ws.onclose = () => {
        if (pingTimer) window.clearInterval(pingTimer)
        pingTimer = null
        scheduleRetry()
      }

      ws.onerror = () => {
        try {
          ws?.close()
        } catch {
          /* ignore */
        }
      }
    }

    function scheduleRetry() {
      if (closed) return
      attempt += 1
      const delay = Math.min(15000, 800 * Math.pow(1.6, attempt))
      retryTimer = window.setTimeout(connect, delay)
    }

    connect()

    return () => {
      closed = true
      if (retryTimer) window.clearTimeout(retryTimer)
      if (pingTimer) window.clearInterval(pingTimer)
      try {
        ws?.close()
      } catch {
        /* ignore */
      }
    }
  }, [enabled])
}
