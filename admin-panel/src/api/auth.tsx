import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, clearTokens, getAccess, loginRequest, setTokens } from './client'

interface Admin {
  id: string
  name: string
  role: string
}

interface AuthCtx {
  admin: Admin | null
  ready: boolean
  login: (phone: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      if (getAccess()) {
        try {
          const me = await api.get('/me')
          if (me.role === 'ADMIN') setAdmin({ id: me.id, name: me.displayName, role: me.role })
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
    if (data.user.role !== 'ADMIN') throw new Error('This account is not an administrator')
    setTokens(data.accessToken, data.refreshToken)
    setAdmin({ id: data.user.id, name: data.user.displayName, role: data.user.role })
  }

  async function logout() {
    try {
      const refresh = localStorage.getItem('zee9-admin-refresh')
      if (refresh) await api.post('/auth/logout', { refreshToken: refresh })
    } catch { /* ignore */ }
    clearTokens()
    setAdmin(null)
  }

  return <Ctx.Provider value={{ admin, ready, login, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth outside provider')
  return c
}
