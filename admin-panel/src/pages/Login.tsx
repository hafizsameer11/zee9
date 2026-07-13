import { useState } from 'react'
import { useAuth } from '../api/auth'

export default function Login() {
  const { login } = useAuth()
  const [phone, setPhone] = useState('03000000000')
  const [password, setPassword] = useState('admin123')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await login(phone.trim(), password)
    } catch (e: any) {
      setErr(e?.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,#1a1734,#241d49)' }}>
      <form onSubmit={submit} className="card" style={{ width: 380, padding: 32 }}>
        <div className="flex gap12" style={{ marginBottom: 22 }}>
          <div className="brand-badge">
            Z<span className="g">9</span>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Zee9 Admin</div>
            <div className="muted" style={{ fontSize: 13 }}>Sign in to the console</div>
          </div>
        </div>

        <div className="fld" style={{ marginBottom: 14 }}>
          <label>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03000000000" autoComplete="username" />
        </div>
        <div className="fld" style={{ marginBottom: 18 }}>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>

        {err && (
          <div className="pill red" style={{ width: '100%', justifyContent: 'center', marginBottom: 14, padding: '8px 10px' }}>
            {err}
          </div>
        )}

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="muted" style={{ fontSize: 12, marginTop: 16, textAlign: 'center' }}>
          Demo: 03000000000 / admin123
        </div>
      </form>
    </div>
  )
}
