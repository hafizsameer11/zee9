import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'

type Summary = {
  name: string
  phone: string
  referralCode: string
  walletsFilled: number
  commissionBalance: number
  salaryTransferOpen?: boolean
  salaryApproved?: number
  salaryHold?: number
  transferable?: number
  earnedTotal: number
  earnedWeek: number
  downline: { level1: number; level2: number; level3: number }
}

type StoreCtx = {
  summary: Summary | null
  toast: string | null
  showToast: (m: string) => void
  reload: () => Promise<void>
}

const Ctx = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  async function reload() {
    setSummary(await api.get('/referral-agent/summary'))
  }

  useEffect(() => {
    void reload().catch((e) => setToast(e?.message || 'Load failed'))
  }, [])

  function showToast(m: string) {
    setToast(m)
    window.setTimeout(() => setToast(null), 2800)
  }

  return <Ctx.Provider value={{ summary, toast, showToast, reload }}>{children}</Ctx.Provider>
}

export function useStore() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useStore outside provider')
  return c
}
