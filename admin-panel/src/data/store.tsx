import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AGENTS,
  CASHBACK_TIERS,
  DEFAULT_SETTINGS,
  DEPOSITS,
  GAMES,
  OFFERS,
  PLAYERS,
  WHEEL_PRIZES,
  WITHDRAWALS,
  type Agent,
  type CashbackTier,
  type GameRow,
  type Offer,
  type Player,
  type Settings,
  type Txn,
  type WheelPrize,
} from './mock'

interface State {
  settings: Settings
  games: GameRow[]
  agents: Agent[]
  players: Player[]
  deposits: Txn[]
  withdrawals: Txn[]
  offers: Offer[]
  cashback: CashbackTier[]
  wheel: WheelPrize[]
}

interface Store extends State {
  patchSettings: (p: Partial<Settings>) => void
  updateGame: (id: string, p: Partial<GameRow>) => void
  updateAgent: (id: string, p: Partial<Agent>) => void
  updatePlayer: (id: string, p: Partial<Player>) => void
  setTxnStatus: (kind: 'deposits' | 'withdrawals', id: string, status: Txn['status']) => void
  updateOffer: (id: string, p: Partial<Offer>) => void
  updateCashback: (id: string, p: Partial<CashbackTier>) => void
  addCashback: () => void
  updateWheel: (id: string, p: Partial<WheelPrize>) => void
  toast: string | null
  showToast: (m: string) => void
  reset: () => void
}

const initial: State = {
  settings: DEFAULT_SETTINGS,
  games: GAMES,
  agents: AGENTS,
  players: PLAYERS,
  deposits: DEPOSITS,
  withdrawals: WITHDRAWALS,
  offers: OFFERS,
  cashback: CASHBACK_TIERS,
  wheel: WHEEL_PRIZES,
}

const LS = 'zee9-admin-v1'
const Ctx = createContext<Store | null>(null)

function load(): State {
  try {
    const raw = localStorage.getItem(LS)
    if (raw) return { ...initial, ...JSON.parse(raw) }
  } catch {}
  return initial
}

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(LS, JSON.stringify(state))
  }, [state])

  const showToast = useCallback((m: string) => {
    setToast(m)
    window.setTimeout(() => setToast(null), 2000)
  }, [])

  const store = useMemo<Store>(() => {
    const upd = <K extends keyof State>(key: K, fn: (v: State[K]) => State[K]) =>
      setState((s) => ({ ...s, [key]: fn(s[key]) }))
    const list = <T extends { id: string }>(arr: T[], id: string, p: Partial<T>) =>
      arr.map((x) => (x.id === id ? { ...x, ...p } : x))

    return {
      ...state,
      patchSettings: (p) => {
        upd('settings', (s) => ({ ...s, ...p }))
        showToast('Settings saved')
      },
      updateGame: (id, p) => upd('games', (g) => list(g, id, p)),
      updateAgent: (id, p) => upd('agents', (a) => list(a, id, p)),
      updatePlayer: (id, p) => upd('players', (a) => list(a, id, p)),
      setTxnStatus: (kind, id, status) => {
        upd(kind, (t) => list(t as Txn[], id, { status }) as any)
        showToast(`Request ${status}`)
      },
      updateOffer: (id, p) => upd('offers', (o) => list(o, id, p)),
      updateCashback: (id, p) => upd('cashback', (c) => list(c, id, p)),
      addCashback: () =>
        upd('cashback', (c) => [
          ...c,
          { id: 'C' + Date.now(), name: 'New Tier', minLoss: 0, pct: 5, maxClaim: 500, enabled: true },
        ]),
      updateWheel: (id, p) => upd('wheel', (w) => list(w, id, p)),
      toast,
      showToast,
      reset: () => {
        localStorage.removeItem(LS)
        setState(initial)
        showToast('Reset to defaults')
      },
    }
  }, [state, toast, showToast])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useAdmin() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAdmin outside provider')
  return c
}
