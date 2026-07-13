import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, authRequest, clearTokens, getAccess, setTokens } from './client'

interface Player {
  id: string
  name: string
  phone: string
  referralCode?: string
  vipLevel?: number
  totalDeposited?: number
}

export interface ReferralParams {
  referralCode?: string
  shareCode?: string
  channel?: string
  bindCode?: string
}

interface AuthCtx {
  player: Player | null
  ready: boolean
  login: (phone: string, password: string) => Promise<void>
  register: (phone: string, password: string, displayName: string, ref?: ReferralParams) => Promise<void>
  logout: () => void
  refreshPlayer: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [ready, setReady] = useState(false)

  async function loadMe() {
    const me = await api.get('/me')
    setPlayer({
      id: me.id,
      name: me.displayName,
      phone: me.phone,
      referralCode: me.referralCode,
      vipLevel: me.vipLevel,
      totalDeposited: me.totalDeposited,
    })
  }

  useEffect(() => {
    ;(async () => {
      if (getAccess()) {
        try {
          await loadMe()
        } catch {
          clearTokens()
        }
      }
      setReady(true)
    })()
  }, [])

  async function login(phone: string, password: string) {
    const data = await authRequest('login', { phone, password })
    setTokens(data.accessToken, data.refreshToken)
    setPlayer({ id: data.user.id, name: data.user.displayName, phone: data.user.phone, referralCode: data.user.referralCode })
    await loadMe()
  }

  async function register(phone: string, password: string, displayName: string, ref?: ReferralParams) {
    const data = await authRequest('register', {
      phone,
      password,
      displayName,
      ...(ref?.referralCode ? { referralCode: ref.referralCode } : {}),
      ...(ref?.shareCode ? { shareCode: ref.shareCode } : {}),
      ...(ref?.channel ? { channel: ref.channel } : {}),
      ...(ref?.bindCode ? { bindCode: ref.bindCode } : {}),
    })
    setTokens(data.accessToken, data.refreshToken)
    setPlayer({ id: data.user.id, name: data.user.displayName, phone: data.user.phone, referralCode: data.user.referralCode })
    await loadMe()
  }

  function logout() {
    const refresh = localStorage.getItem('zee9-player-refresh')
    if (refresh) api.post('/auth/logout', { refreshToken: refresh }).catch(() => {})
    clearTokens()
    setPlayer(null)
  }

  return (
    <Ctx.Provider value={{ player, ready, login, register, logout, refreshPlayer: loadMe }}>{children}</Ctx.Provider>
  )
}

export function usePlayerAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('usePlayerAuth outside provider')
  return c
}
