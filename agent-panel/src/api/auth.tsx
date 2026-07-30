import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, clearTokens, getAccess, loginRequest, setTokens } from './client'

interface Agent {
  id: string
  name: string
  phone: string
}

interface AuthCtx {
  agent: Agent | null
  ready: boolean
  login: (phone: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      if (getAccess()) {
        try {
          const me = await api.get('/me')
          if (me.referralAgentActive) setAgent({ id: me.id, name: me.displayName, phone: me.phone })
          else clearTokens()
        } catch {
          clearTokens()
        }
      }
      setReady(true)
    })()
  }, [])

  async function login(phone: string, password: string) {
    const data = await loginRequest(phone, password)
    setTokens(data.accessToken, data.refreshToken)
    const me = await api.get('/me')
    if (!me.referralAgentActive) {
      clearTokens()
      throw new Error('This login is not an approved referral agent')
    }
    setAgent({ id: me.id, name: me.displayName, phone: me.phone })
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
