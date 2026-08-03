import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, authRequest, clearTokens, getAccess, setTokens } from './client'

interface Player {
  id: string
  name: string
  phone: string
  referralCode?: string
  playerNo?: number
  vipLevel?: number
  totalDeposited?: number
  referralAgentActive?: boolean
  birthday?: string | null
  birthdaySet?: boolean
  hasWithdrawPin?: boolean
}

export interface ReferralParams {
  referralCode?: string
  shareCode?: string
  playerId?: string
  channel?: string
  bindCode?: string
}

interface AuthCtx {
  player: Player | null
  ready: boolean
  /** Set when the signed-in account may not use the game app (e.g. a C2C merchant). */
  blocked: string | null
  login: (phone: string, password: string) => Promise<void>
  register: (phone: string, password: string, displayName: string, ref?: ReferralParams) => Promise<void>
  logout: () => void
  refreshPlayer: () => Promise<void>
}

const MERCHANT_BLOCKED = 'This is a C2C merchant account. Sign in on the merchant panel instead.'

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [ready, setReady] = useState(false)
  const [blocked, setBlocked] = useState<string | null>(null)

  async function loadMe() {
    const me = await api.get('/me')
    if (me.role === 'AGENT') {
      clearTokens()
      setPlayer(null)
      setBlocked(MERCHANT_BLOCKED)
      throw new Error(MERCHANT_BLOCKED)
    }
    setBlocked(null)
    setPlayer({
      id: me.id,
      name: me.displayName,
      phone: me.phone,
      referralCode: me.referralCode,
      playerNo: me.playerNo,
      vipLevel: me.vipLevel,
      totalDeposited: me.totalDeposited,
      referralAgentActive: !!me.referralAgentActive,
      birthday: me.birthday ?? null,
      birthdaySet: !!me.birthdaySet,
      hasWithdrawPin: !!me.hasWithdrawPin,
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
    const data = await authRequest('login', { phone, password, app: 'player' })
    setTokens(data.accessToken, data.refreshToken)
    setPlayer({ id: data.user.id, name: data.user.displayName, phone: data.user.phone, referralCode: data.user.referralCode, playerNo: data.user.playerNo })
    await loadMe()
  }

  async function register(phone: string, password: string, displayName: string, ref?: ReferralParams) {
    const data = await authRequest('register', {
      phone,
      password,
      displayName,
      ...(ref?.referralCode ? { referralCode: ref.referralCode } : {}),
      ...(ref?.shareCode ? { shareCode: ref.shareCode } : {}),
      ...(ref?.playerId ? { playerId: ref.playerId } : {}),
      ...(ref?.channel ? { channel: ref.channel } : {}),
      ...(ref?.bindCode ? { bindCode: ref.bindCode } : {}),
    })
    setTokens(data.accessToken, data.refreshToken)
    setPlayer({ id: data.user.id, name: data.user.displayName, phone: data.user.phone, referralCode: data.user.referralCode, playerNo: data.user.playerNo })
    await loadMe()
  }

  function logout() {
    const refresh = localStorage.getItem('zee9-player-refresh')
    if (refresh) api.post('/auth/logout', { refreshToken: refresh }).catch(() => {})
    clearTokens()
    setPlayer(null)
    setBlocked(null)
  }

  return (
    <Ctx.Provider value={{ player, ready, blocked, login, register, logout, refreshPlayer: loadMe }}>
      {children}
    </Ctx.Provider>
  )
}

export function usePlayerAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('usePlayerAuth outside provider')
  return c
}
