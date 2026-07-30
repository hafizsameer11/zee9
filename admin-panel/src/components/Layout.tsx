import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { Icons, type IconKey } from './icons'
import { useAdmin } from '../data/store'
import { useAuth } from '../api/auth'
import { api } from '../api/client'

interface NavDef {
  group: string
  items: { to: string; label: string; icon: IconKey; badge?: () => string | number | undefined }[]
}

export default function Layout({ children }: { children: ReactNode }) {
  const { withdrawals, deposits, toast, settings, showToast } = useAdmin()
  const { admin, logout } = useAuth()
  const pendingW = withdrawals.filter((w) => w.status === 'pending').length
  const pendingD = deposits.filter((d) => d.status === 'pending').length
  const loc = useLocation()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)

  async function globalSearch() {
    const term = q.trim()
    if (!term) return
    setSearching(true)
    try {
      const res = await api.get(`/admin/users?q=${encodeURIComponent(term)}&limit=20`)
      const list = Array.isArray(res) ? res : (res?.items || [])
      if (list.length === 0) {
        showToast('No user found')
        return
      }
      const exact = list.find((u: any) => u.id === term || u.id.endsWith(term) || u.phone === term) || list[0]
      navigate(`/users/${exact.id}`)
      setQ('')
    } catch (e: any) {
      showToast(e?.message || 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const nav: NavDef[] = [
    { group: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: 'dashboard' }] },
    {
      group: 'Operations',
      items: [
        { to: '/games', label: 'Games', icon: 'games' },
        { to: '/players', label: 'Players', icon: 'players' },
        { to: '/c2c', label: 'C2C Merchants', icon: 'agents' },
        { to: '/agents', label: 'Referral Agents', icon: 'referrals' },
        { to: '/referrals', label: 'Referrals & Commission', icon: 'referrals' },
        { to: '/channels', label: 'Channels & Mentors', icon: 'agents' },
      ],
    },
    {
      group: 'Finance',
      items: [
        { to: '/deposits', label: 'Deposits', icon: 'deposit', badge: () => pendingD || undefined },
        { to: '/payment-channels', label: 'C2C Float Banks', icon: 'deposit' },
        { to: '/withdrawals', label: 'Withdrawals', icon: 'withdraw', badge: () => pendingW || undefined },
      ],
    },
    {
      group: 'Engagement',
      items: [
        { to: '/bonuses', label: 'Bonuses & Wager', icon: 'bonus' },
        { to: '/vip', label: 'VIP Salary', icon: 'offers' },
        { to: '/free-cash', label: 'Free Cash', icon: 'cashback' },
        { to: '/cashback', label: 'Bet Rebate', icon: 'cashback' },
        { to: '/offers', label: 'Offers', icon: 'offers' },
        { to: '/wheel', label: 'Lucky Wheel', icon: 'wheel' },
      ],
    },
    { group: 'System', items: [{ to: '/settings', label: 'Settings', icon: 'settings' }] },
  ]

  const active = (to: string) => (to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to))

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-badge">
            Z<span className="g">9</span>
          </div>
          <div className="brand-name">
            {settings.platformName}
            <small>ADMIN CONSOLE</small>
          </div>
        </div>
        <nav className="nav">
          {nav.map((g) => (
            <div key={g.group}>
              <div className="nav-group-label">{g.group}</div>
              {g.items.map((it) => {
                const badge = it.badge?.()
                return (
                  <NavLink key={it.to} to={it.to} className={'nav-item' + (active(it.to) ? ' active' : '')}>
                    <span className="ico">{Icons[it.icon]}</span>
                    {it.label}
                    {badge != null && <span className="nav-badge">{badge}</span>}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="search">
            {Icons.search}
            <input
              placeholder="Game ID / phone / name — Enter to open…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !searching && globalSearch()}
            />
          </div>
          <div className="topbar-spacer" />
          <button className="topbar-btn">
            {Icons.bell}
            {(pendingW || pendingD) > 0 && <span className="dot" />}
          </button>
          <div className="topbar-user">
            <div className="ava">{(admin?.name ?? 'AD').slice(0, 2).toUpperCase()}</div>
            <div className="who">
              <b>{admin?.name ?? 'Admin'}</b>
              <span>{admin?.role ?? 'ADMIN'}</span>
            </div>
            <button className="topbar-btn" title="Log out" onClick={logout} style={{ marginLeft: 6 }}>
              {Icons.logout}
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>

      {toast && (
        <div className="toast">
          <span className="tk">{Icons.check}</span>
          {toast}
        </div>
      )}
    </div>
  )
}
