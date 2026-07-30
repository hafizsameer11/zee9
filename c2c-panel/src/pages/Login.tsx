import { useState } from 'react'
import { Shell, StatusBar } from '../components/ui'
import { useAuth } from '../api/auth'

export default function Login() {
  const { login } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
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
    <Shell>
      <StatusBar />
      <div className="scroll pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>C2C Merchant Panel</div>
          <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 12, marginTop: 4 }}>Cash-to-cash collections</div>
        </div>

        <form onSubmit={submit} className="card" style={{ padding: 16 }}>
          <div className="field">
            <label>Phone number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xxxxxxxxx" inputMode="tel" autoComplete="username" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          {err && <div className="tips" style={{ marginBottom: 8 }}>{err}</div>}
          <button className="btn btn-violet btn-block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 14 }}>
            Merchants only. Players and referral agents cannot sign in here. Admin creates your merchant login.
          </div>
        </form>
      </div>
    </Shell>
  )
}
