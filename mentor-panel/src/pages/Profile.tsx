import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar } from '../components/ui'
import { useAuth } from '../api/auth'
import { useStore } from '../data/store'

export default function Profile() {
  const nav = useNavigate()
  const { mentor, logout } = useAuth()
  const { summary } = useStore()
  return (
    <Shell>
      <StatusBar />
      <div className="topbar">
        <button className="tb-btn" onClick={() => nav(-1)}>
          ‹
        </button>
        <div className="tb-title">Profile</div>
        <span className="tb-spacer" />
      </div>
      <div className="scroll pad">
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{mentor?.name}</div>
          <div style={{ opacity: 0.8 }}>{mentor?.phone}</div>
          {summary && (
            <div style={{ marginTop: 8, fontSize: 13 }}>
              Channel {summary.channel.code} · {summary.channel.name}
            </div>
          )}
        </div>
        <button className="btn btn-violet btn-block" style={{ marginTop: 14 }} onClick={() => nav('/login-password')}>
          Change password
        </button>
        <button
          className="btn btn-violet btn-block"
          style={{ marginTop: 10, background: '#b71c1c' }}
          onClick={() => {
            logout()
            nav('/')
          }}
        >
          Log out
        </button>
      </div>
    </Shell>
  )
}
