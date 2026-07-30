import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'

type Summary = {
  channel: { code: string; name: string; enabled: boolean }
  members: number
  referralAgents: number
  commissionBalance: number
  earnedTotal: number
  earnedWeek: number
  rates: { l1: number; l2: number; l3: number }
  sharePath: string
}

type StoreCtx = {
  summary: Summary | null
  loadError: string | null
  toast: string | null
  showToast: (m: string) => void
  reload: () => Promise<void>
}

const Ctx = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  async function reload() {
    setLoadError(null)
    try {
      setSummary(await api.get('/mentor/summary'))
    } catch (e: any) {
      setLoadError(e?.message || 'Load failed')
      throw e
    }
  }

  useEffect(() => {
    void reload().catch(() => {})
  }, [])

  function showToast(m: string) {
    setToast(m)
    window.setTimeout(() => setToast(null), 2800)
  }

  return <Ctx.Provider value={{ summary, loadError, toast, showToast, reload }}>{children}</Ctx.Provider>
}

export function useStore() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useStore outside provider')
  return c
}
