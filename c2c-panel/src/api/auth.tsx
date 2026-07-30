import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ApiError, api, clearTokens, getAccess, loginRequest, setTokens } from './client'

interface Merchant {
  id: string
  name: string
  phone: string
  panelId: number
}

interface AuthCtx {
  agent: Merchant | null
  ready: boolean
  login: (phone: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

function isC2cMerchant(me: { role?: string; panelId?: number | null }) {
  return me.role === 'AGENT' && me.panelId != null && Number(me.panelId) > 0
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Merchant | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (getAccess()) {
        try {
          const me = await api.get('/me')
          if (cancelled) return
          if (isC2cMerchant(me)) {
            setAgent({ id: me.id, name: me.displayName, phone: me.phone, panelId: me.panelId })
          } else {
            clearTokens()
            setAgent(null)
          }
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) {
            clearTokens()
            if (!cancelled) setAgent(null)
          }
        }
      }
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function login(phone: string, password: string) {
    const data = await loginRequest(phone, password)
    // Players / referral agents / mentors use other panels — never C2C
    if (data.user.role !== 'AGENT') {
      throw new Error('Merchant login only. Players and referral agents cannot use this panel.')
    }
    setTokens(data.accessToken, data.refreshToken)
    try {
      const me = await api.get('/me')
      if (!isC2cMerchant(me)) {
        clearTokens()
        throw new Error('Merchant login only. This account is not a C2C merchant.')
      }
      setAgent({ id: me.id, name: me.displayName, phone: me.phone, panelId: me.panelId })
    } catch (e) {
      clearTokens()
      throw e
    }
  }

  function logout() {
    clearTokens()
    setAgent(null)
  }

  return <Ctx.Provider value={{ agent, ready, login, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth outside provider')
  return c
}
