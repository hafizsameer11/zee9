import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, TopBar } from '../components/ui'
import { useAuth } from '../api/auth'

export default function Profile() {
  const nav = useNavigate()
  const { agent, logout } = useAuth()
  return (
    <Shell>
      <StatusBar />
      <TopBar title="" onBack={() => nav('/')} />
      <div className="scroll">
        <div className="profile-head">
          <div className="pf-ava">&#128100;</div>
          <div className="pf-name">{agent?.name ?? 'Merchant'}</div>
        </div>

        <div className="card menu-card">
          <div className="menu-item">
            <span className="mi-k">User ID</span>
            <span className="mi-v">{agent?.panelId ?? '—'}</span>
          </div>
          <div className="menu-item">
            <span className="mi-k">Phone Number</span>
            <span className="mi-v">{agent?.phone}</span>
          </div>
          <div className="menu-item" onClick={() => nav('/login-password')}>
            <span className="mi-k">Login Password</span>
            <span className="chev">&#8250;</span>
          </div>
          <div className="menu-item" onClick={() => nav('/accounts')}>
            <span className="mi-k">Account Management</span>
            <span className="chev">&#8250;</span>
          </div>
          <div className="menu-item">
            <span className="mi-k">Version</span>
            <span className="mi-v">v1.1.0</span>
          </div>
        </div>

        <div className="logout-wrap">
          <button className="btn btn-gold btn-block" onClick={logout}>
            Log Out
          </button>
        </div>
      </div>
    </Shell>
  )
}
