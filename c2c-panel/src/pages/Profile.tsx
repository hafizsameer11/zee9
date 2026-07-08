import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, TopBar } from '../components/ui'
import { USER } from '../data/mock'

export default function Profile() {
  const nav = useNavigate()
  return (
    <Shell>
      <StatusBar />
      <TopBar title="" onBack={() => nav('/')} />
      <div className="scroll">
        <div className="profile-head">
          <div className="pf-ava">&#128100;</div>
          <div className="pf-name">{USER.name}</div>
        </div>

        <div className="card menu-card">
          <div className="menu-item">
            <span className="mi-k">User ID</span>
            <span className="mi-v">{USER.userId}</span>
          </div>
          <div className="menu-item">
            <span className="mi-k">Phone Number</span>
            <span className="mi-v">{USER.phone}</span>
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
            <span className="mi-v">{USER.version}</span>
          </div>
        </div>

        <div className="logout-wrap">
          <button className="btn btn-gold btn-block" onClick={() => nav('/')}>
            Log Out
          </button>
        </div>
      </div>
    </Shell>
  )
}
