import { useCallback, useEffect, useState } from 'react'
import { api, getAccess } from './client'

export interface PlayerConfig {
  platformName: string
  currency: string
  whatsapp: string | null
  shareLink: string
  tickerText: string
  limits: { minDeposit: number; maxDeposit: number; minWithdraw: number; maxWithdraw: number }
  methods: Record<string, boolean>
  depositPresets?: number[]
  bonuses: { registration: number; dailyOpen: number; deposit: number[]; dailyDeposit: number }
  wager: { bonus: number; deposit: number }
  wheel: { depositPerSpin: number }
  layout?: { csUpperRight?: boolean; wheelsLowerTop?: boolean }
}

export function useConfig() {
  const [config, setConfig] = useState<PlayerConfig | null>(null)
  useEffect(() => {
    api.get('/config').then(setConfig).catch(() => {})
  }, [])
  return config
}

export interface Notif {
  id: string
  kind: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

export function useNotifications() {
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)

  const refetch = useCallback(async () => {
    if (!getAccess()) return
    try {
      const data = await api.get('/me/notifications')
      setItems(data.items)
      setUnread(data.unread)
    } catch {
      /* ignore */
    }
  }, [])

  const markRead = useCallback(async () => {
    try {
      await api.post('/me/notifications/read')
      setUnread(0)
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    refetch()
    const t = window.setInterval(refetch, 20000)
    return () => window.clearInterval(t)
  }, [refetch])

  return { items, unread, markRead, refetch }
}

export interface Withdrawal {
  id: string
  amount: number
  method: string
  status: string
  createdAt: string
  rejectReason?: string
}

export function useWithdrawals() {
  const [items, setItems] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!getAccess()) return
    setLoading(true)
    try {
      const rows = await api.get('/withdrawals')
      setItems(rows.map((w: any) => ({
        id: w.id,
        amount: Number(w.amount) / 100,
        method: w.method,
        status: w.status,
        createdAt: w.createdAt,
        rejectReason: w.rejectReason,
      })))
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { items, loading, refetch }
}

export interface WheelStatus {
  prizes: { id: string; label: string; color: string; isPhysical: boolean; weight: number }[]
  tickets: number
  depositPerSpin: number
  depositProgress: number
  depositRequired: number
  progressPct: number
}

export function useWheelStatus() {
  const [status, setStatus] = useState<WheelStatus | null>(null)

  const refetch = useCallback(async () => {
    if (!getAccess()) return
    try {
      setStatus(await api.get('/wheel'))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { status, refetch }
}

export interface CashbackStatus {
  todayLoss: number
  currentRate: number
  currentTier: string | null
  eligibleAmount: number
  claimedToday: boolean
  totalClaimed: number
}

export function useCashback() {
  const [status, setStatus] = useState<CashbackStatus | null>(null)

  const refetch = useCallback(async () => {
    if (!getAccess()) return
    try {
      setStatus(await api.get('/bonuses/cashback'))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { status, refetch }
}
