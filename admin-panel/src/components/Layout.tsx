import { NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Icons, type IconKey } from './icons'
import { useAdmin } from '../data/store'

interface NavDef {
  group: string
  items: { to: string; label: string; icon: IconKey; badge?: () => string | number | undefined }[]
}

export default function Layout({ children }: { children: ReactNode }) {
  const { withdrawals, deposits, toast, settings } = useAdmin()
  const pendingW = withdrawals.filter((w) => w.status === 'pending').length
  const pendingD = deposits.filter((d) => d.status === 'pending').length
  const loc = useLocation()

  const nav: NavDef[] = [
    { group: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: 'dashboard' }] },
    {
      group: 'Operations',
      items: [
        { to: '/games', label: 'Games', icon: 'games' },
        { to: '/players', label: 'Players', icon: 'players' },
        { to: '/agents', label: 'Agents', icon: 'agents' },
        { to: '/referrals', label: 'Referrals & Commission', icon: 'referrals' },
      ],
    },
    {
      group: 'Finance',
      items: [
        { to: '/deposits', label: 'Deposits', icon: 'deposit', badge: () => pendingD || undefined },
        { to: '/withdrawals', label: 'Withdrawals', icon: 'withdraw', badge: () => pendingW || undefined },
      ],
    },
    {
      group: 'Engagement',
      items: [
        { to: '/bonuses', label: 'Bonuses & Wager', icon: 'bonus' },
        { to: '/cashback', label: 'Cashback', icon: 'cashback' },
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
            <input placeholder="Search players, agents, orders…" />
          </div>
          <div className="topbar-spacer" />
          <button className="topbar-btn">
            {Icons.bell}
            {(pendingW || pendingD) > 0 && <span className="dot" />}
          </button>
          <div className="topbar-user">
            <div className="ava">AD</div>
            <div className="who">
              <b>Super Admin</b>
              <span>admin@zee9</span>
            </div>
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
