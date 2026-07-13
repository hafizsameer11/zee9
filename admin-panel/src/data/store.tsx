import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import { DEFAULT_SETTINGS, type Agent, type AgentAccountReview, type CashbackTier, type GameRow, type Offer, type Player, type Settings, type Txn, type WheelPrize } from './mock'

export interface RevenuePoint {
  d: string
  dep: number
  wd: number
}

export interface DashboardStats {
  players: number
  agents: number
  pendingDeposits: number
  pendingWithdrawals: number
  totalDeposited: number
  totalWithdrawn: number
  totalCommission: number
  liveGames: number
}

export interface AgentCreds {
  id: string
  phone: string
  displayName: string
  referralCode: string
  password: string
}

interface State {
  settings: Settings
  games: GameRow[]
  agents: Agent[]
  agentAccounts: AgentAccountReview[]
  players: Player[]
  deposits: Txn[]
  withdrawals: Txn[]
  offers: Offer[]
  cashback: CashbackTier[]
  wheel: WheelPrize[]
  revenueSeries: RevenuePoint[]
  dashboard: DashboardStats | null
  loadErrors: string[]
}

interface Store extends State {
  loading: boolean
  patchSettings: (p: Partial<Settings>) => void
  updateGame: (id: string, p: Partial<GameRow>) => void
  updateAgent: (id: string, p: Partial<Agent>) => void
  updatePlayer: (id: string, p: Partial<Player>) => void
  setTxnStatus: (kind: 'deposits' | 'withdrawals', id: string, status: Txn['status']) => void
  assignWithdrawal: (id: string, agentId: string) => void
  updateOffer: (id: string, p: Partial<Offer>) => void
  updateCashback: (id: string, p: Partial<CashbackTier>) => void
  addCashback: () => void
  updateWheel: (id: string, p: Partial<WheelPrize>) => void
  addGame: () => void
  addOffer: () => void
  addWheelPrize: () => void
  addNonePrize: () => void
  deleteWheelPrize: (id: string) => void
  deleteGame: (id: string) => void
  deleteOffer: (id: string) => void
  deleteCashback: (id: string) => void
  createAgent: (phone: string, displayName: string) => Promise<AgentCreds>
  makeAgent: (userId: string) => Promise<AgentCreds>
  approveAgentAccount: (id: string) => void
  rejectAgentAccount: (id: string) => void
  payoutAgentCommission: (agentId: string) => void
  toast: string | null
  showToast: (m: string) => void
  reset: () => void
}

const Ctx = createContext<Store | null>(null)

const r = (paisa: number | bigint | undefined) => Number(paisa ?? 0) / 100
const METHOD: Record<string, Txn['method']> = { JAZZCASH: 'Jazzcash', EASYPAISA: 'Easypaisa', BANK: 'Bank' }
const TXN_STATUS: Record<string, Txn['status']> = { PENDING: 'pending', APPROVED: 'approved', PAID: 'approved', REJECTED: 'rejected' }
const USER_STATUS: Record<string, Player['status']> = { ACTIVE: 'active', BANNED: 'banned', PENDING: 'new' }

function mapAgentAccount(a: any): AgentAccountReview {
  return {
    id: a.id,
    agentId: a.userId,
    agentName: a.user?.displayName ?? '—',
    agentPhone: a.user?.phone ?? '',
    method: a.method,
    number: a.number,
    holder: a.holder,
    createdAt: String(a.createdAt).slice(0, 16).replace('T', ' '),
  }
}
function mapGame(g: any): GameRow {
  return { id: g.id, title: g.title, emoji: g.emoji, color: g.color, category: g.category, enabled: g.enabled, winPct: g.winPct, tag: g.tag || undefined, plays: g.plays, ggr: r(g.ggr), order: g.order }
}
function mapAgent(a: any): Agent {
  return { id: a.id, name: a.displayName, phone: a.phone, level: 1, walletsFilled: a.walletsFilled, active: a.agentActive, referrals: a.referrals ?? 0, commission: r(a.commission), commissionBalance: r(a.commissionBalance), joined: String(a.createdAt).slice(0, 10) }
}
function mapPlayer(u: any): Player {
  return { id: u.id, name: u.displayName, phone: u.phone, balance: r(u.balance), bonus: r(u.bonus), deposited: r(u.deposited), withdrawn: r(u.withdrawn), status: USER_STATUS[u.status] ?? 'active', vip: u.vipLevel, referredBy: u.referredByName || u.referredById || undefined, joined: String(u.createdAt).slice(0, 10) }
}
function mapTxn(t: any): Txn {
  return { id: t.id, user: t.user?.displayName ?? '—', phone: t.user?.phone ?? '', amount: r(t.amount), method: METHOD[t.method] ?? 'Bank', status: TXN_STATUS[t.status] ?? 'pending', time: String(t.createdAt).replace('T', ' ').slice(0, 16) }
}
function mapCashback(c: any): CashbackTier {
  return { id: c.id, name: c.name, minLoss: r(c.minLoss), pct: c.pct, maxClaim: r(c.maxClaim), enabled: c.enabled }
}
function mapWheel(w: any): WheelPrize {
  return { id: w.id, label: w.label, color: w.color, weight: w.weight, isPhysical: w.isPhysical }
}

async function safeGet<T>(path: string, fallback: T): Promise<{ data: T; error?: string }> {
  try {
    return { data: await api.get(path) }
  } catch (e: any) {
    return { data: fallback, error: `${path}: ${e?.message || 'failed'}` }
  }
}

const EMPTY: State = {
  settings: DEFAULT_SETTINGS,
  games: [],
  agents: [],
  agentAccounts: [],
  players: [],
  deposits: [],
  withdrawals: [],
  offers: [],
  cashback: [],
  wheel: [],
  revenueSeries: [],
  dashboard: null,
  loadErrors: [],
}

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(EMPTY)
  const [booting, setBooting] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((m: string) => {
    setToast(m)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const loadAll = useCallback(async () => {
    const errors: string[] = []
    const pick = <T,>(res: { data: T; error?: string }) => { if (res.error) errors.push(res.error); return res.data }

    const [settings, games, agents, agentAccounts, playersRes, deposits, withdrawals, offers, cashback, wheel, revenue, dashboard] = await Promise.all([
      safeGet('/admin/settings', DEFAULT_SETTINGS),
      safeGet('/admin/games', []),
      safeGet('/admin/agents', []),
      safeGet('/admin/agent-accounts?awaitingReview=true', []),
      safeGet('/admin/users?role=PLAYER&limit=100', { items: [] }),
      safeGet('/admin/deposits', []),
      safeGet('/admin/withdrawals', []),
      safeGet('/admin/offers', []),
      safeGet('/admin/cashback', []),
      safeGet('/admin/wheel', []),
      safeGet('/admin/reports/revenue-series?days=7', []),
      safeGet('/admin/dashboard', null),
    ])

    setState({
      settings: pick(settings),
      games: pick(games).map(mapGame),
      agents: pick(agents).map(mapAgent),
      agentAccounts: pick(agentAccounts).map(mapAgentAccount),
      players: (pick(playersRes).items ?? []).map(mapPlayer),
      deposits: pick(deposits).map(mapTxn),
      withdrawals: pick(withdrawals).map(mapTxn),
      offers: pick(offers),
      cashback: pick(cashback).map(mapCashback),
      wheel: pick(wheel).map(mapWheel),
      revenueSeries: pick(revenue).map((p: any) => ({ d: new Date(p.date).toLocaleDateString('en-US', { weekday: 'short' }), dep: r(p.deposits), wd: r(p.withdrawals) })),
      dashboard: pick(dashboard) ? {
        players: pick(dashboard).players,
        agents: pick(dashboard).agents,
        pendingDeposits: pick(dashboard).pendingDeposits,
        pendingWithdrawals: pick(dashboard).pendingWithdrawals,
        totalDeposited: r(pick(dashboard).totalDeposited),
        totalWithdrawn: r(pick(dashboard).totalWithdrawn),
        totalCommission: r(pick(dashboard).totalCommission),
        liveGames: pick(dashboard).liveGames,
      } : null,
      loadErrors: errors,
    })
    setBooting(false)
    if (errors.length) showToast(`Some data failed to load (${errors.length})`)
  }, [showToast])

  useEffect(() => { loadAll() }, [loadAll])

  const patch = useCallback(<K extends keyof State>(key: K, fn: (v: State[K]) => State[K]) => {
    setState((s) => ({ ...s, [key]: fn(s[key]) }))
  }, [])
  const listPatch = <T extends { id: string }>(arr: T[], id: string, p: Partial<T>) => arr.map((x) => (x.id === id ? { ...x, ...p } : x))

  const run = useCallback(
    async (apiCall: () => Promise<unknown>, okMsg?: string) => {
      try {
        await apiCall()
        if (okMsg) showToast(okMsg)
      } catch (e: any) {
        showToast(e?.message || 'Action failed')
        loadAll().catch(() => {})
      }
    },
    [loadAll, showToast],
  )

  const store = useMemo<Store>(() => ({
    ...state,
    loading: booting,
    toast,
    showToast,
    reset: () => { loadAll().then(() => showToast('Reloaded from server')).catch((e) => showToast(e?.message || 'Reload failed')) },

    patchSettings: (p) => {
      patch('settings', (cur) => ({ ...cur, ...p }))
      run(() => api.patch('/admin/settings', p), 'Settings saved')
    },
    updateGame: (id, p) => {
      patch('games', (g) => listPatch(g, id, p))
      const body: any = {}
      for (const k of ['title', 'emoji', 'color', 'category', 'enabled', 'winPct'] as const) if (p[k] !== undefined) body[k] = p[k]
      if ('tag' in p) body.tag = p.tag ?? null
      run(() => api.patch(`/admin/games/${id}`, body))
    },
    updateAgent: (id, p) => {
      patch('agents', (a) => listPatch(a, id, p))
      if (p.active !== undefined) run(() => api.post(`/admin/agents/${id}/active`, { active: p.active }))
    },
    updatePlayer: (id, p) => {
      patch('players', (a) => listPatch(a, id, p))
      if (p.status) run(() => api.post(`/admin/users/${id}/status`, { status: p.status === 'banned' ? 'BANNED' : 'ACTIVE' }), p.status === 'banned' ? 'Player banned' : 'Player unbanned')
    },
    setTxnStatus: (kind, id, status) => {
      patch(kind, (t) => listPatch(t as Txn[], id, { status }) as any)
      const call =
        kind === 'deposits'
          ? status === 'approved'
            ? () => api.post(`/admin/deposits/${id}/approve`)
            : () => api.post(`/admin/deposits/${id}/reject`, { reason: 'Rejected by admin' })
          : status === 'approved'
            ? () => api.post(`/admin/withdrawals/${id}/pay`, { trxId: 'MANUAL-' + Date.now() })
            : () => api.post(`/admin/withdrawals/${id}/reject`, { reason: 'Rejected by admin' })
      run(async () => { await call(); await loadAll() }, `Request ${status}`)
    },
    assignWithdrawal: (id, agentId) => {
      run(async () => { await api.post(`/admin/withdrawals/${id}/assign`, { agentId }); await loadAll() }, 'Assigned to agent')
    },
    updateOffer: (id, p) => {
      patch('offers', (o) => listPatch(o, id, p))
      run(() => api.patch(`/admin/offers/${id}`, p))
    },
    updateCashback: (id, p) => {
      patch('cashback', (c) => listPatch(c, id, p))
      run(() => api.patch(`/admin/cashback/${id}`, p))
    },
    addCashback: () => {
      run(async () => { await api.post('/admin/cashback', { name: 'New Tier', minLoss: 0, pct: 5, maxClaim: 500, enabled: true }); await loadAll() }, 'Tier added')
    },
    updateWheel: (id, p) => {
      patch('wheel', (w) => listPatch(w, id, p))
      run(() => api.patch(`/admin/wheel/${id}`, p))
    },
    addGame: () => {
      run(async () => { await api.post('/admin/games', { slug: 'new-game-' + Date.now(), title: 'New Game', emoji: '🎮', color: '#6d5efc', category: 'Slots', winPct: 90 }); await loadAll() }, 'Game added')
    },
    addOffer: () => {
      run(async () => { await api.post('/admin/offers', { title: 'New Offer', desc: 'Describe this offer', type: 'Deposit', reward: '+10%', enabled: true }); await loadAll() }, 'Offer added')
    },
    addWheelPrize: () => {
      run(async () => { await api.post('/admin/wheel', { label: 'Rs 100', color: '#e67e22', weight: 10, isPhysical: false, order: state.wheel.length }); await loadAll() }, 'Prize added')
    },
    addNonePrize: () => {
      run(async () => { await api.post('/admin/wheel', { label: 'None', color: '#7f8c8d', weight: 10, isPhysical: false, order: state.wheel.length }); await loadAll() }, 'None segment added')
    },
    deleteWheelPrize: (id) => {
      run(async () => { await api.del(`/admin/wheel/${id}`); await loadAll() }, 'Prize removed')
    },
    deleteGame: (id) => {
      run(async () => { await api.del(`/admin/games/${id}`); await loadAll() }, 'Game removed')
    },
    deleteOffer: (id) => {
      run(async () => { await api.del(`/admin/offers/${id}`); await loadAll() }, 'Offer removed')
    },
    deleteCashback: (id) => {
      run(async () => { await api.del(`/admin/cashback/${id}`); await loadAll() }, 'Tier removed')
    },
    createAgent: async (phone, displayName) => {
      const creds = (await api.post('/admin/agents', { phone, displayName })) as AgentCreds
      await loadAll()
      showToast('Agent created')
      return creds
    },
    makeAgent: async (userId) => {
      const creds = (await api.post(`/admin/users/${userId}/make-agent`)) as AgentCreds
      await loadAll()
      showToast('Promoted to agent')
      return creds
    },
    approveAgentAccount: (id) => {
      run(async () => { await api.post(`/admin/agent-accounts/${id}/approve`); await loadAll() }, 'Account approved')
    },
    rejectAgentAccount: (id) => {
      run(async () => { await api.post(`/admin/agent-accounts/${id}/reject`, {}); await loadAll() }, 'Account rejected')
    },
    payoutAgentCommission: (agentId) => {
      run(async () => { await api.post('/admin/commissions/payout', { agentId }); await loadAll() }, 'Commission paid out')
    },
  }), [state, booting, toast, showToast, patch, run, loadAll])

  if (booting) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: '#8a8aa3', fontSize: 14 }}>
        Loading console…
      </div>
    )
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useAdmin() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAdmin outside provider')
  return c
}
