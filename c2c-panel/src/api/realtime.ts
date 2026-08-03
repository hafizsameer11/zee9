import { useEffect, useRef } from 'react'
import { getAccess } from './client'

const API_BASE = ((import.meta as any).env?.VITE_API_BASE as string) || 'http://localhost:4000/api/v1'

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

function wsUrl(token: string) {
  const base = API_BASE.replace(/\/$/, '')
  const u = new URL(base.replace(/^http/, 'ws') + '/agent/ws')
  u.searchParams.set('token', token)
  return u.toString()
}

function showBrowserNotification(title: string, body: string, tag: string) {
  try {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'granted') {
      const n = new Notification(title, { body, tag })
      window.setTimeout(() => n.close(), 8000)
    }
  } catch {
    /* ignore */
  }
}

export function requestNotificationPermission() {
  try {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  } catch {
    /* ignore */
  }
}

/** Keep a live WebSocket to the backend; call onEvent for deposit / withdraw alerts. */
export function useMerchantRealtime(enabled: boolean, onEvent: (ev: MerchantRealtimeEvent) => void) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!enabled) return
    const token = getAccess()
    if (!token) return

    requestNotificationPermission()

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
          if (parsed?.type === 'withdraw_new') {
            const data = parsed.data as MerchantWithdrawEvent
            data.type = 'withdraw_new'
            showBrowserNotification(data.title, data.body, 'zee9-c2c-withdraw')
            onEventRef.current(data)
            return
          }
          if (
            parsed?.type === 'deposit_new' ||
            parsed?.type === 'deposit_submitted' ||
            parsed?.type === 'deposit_resolved'
          ) {
            const data = parsed.data as MerchantDepositEvent
            if (parsed.type === 'deposit_resolved') data.type = 'deposit_resolved'
            showBrowserNotification(data.title, data.body, 'zee9-c2c-deposit')
            onEventRef.current(data)
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
      const delay = Math.min(15000, 1000 * Math.pow(1.6, attempt))
      if (retryTimer) window.clearTimeout(retryTimer)
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
