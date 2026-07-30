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
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#fff' }}>Agent Panel</div>
          <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 14, marginTop: 4 }}>Referral salary · Level 3 → 1</div>
        </div>
        <form onSubmit={submit} className="card" style={{ padding: 22 }}>
          <div className="field">
            <label>Phone number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xxxxxxxxx" inputMode="tel" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <div style={{ color: '#c62828', fontSize: 13, marginBottom: 10 }}>{err}</div>}
          <button className="btn btn-violet btn-block" disabled={busy} type="submit">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </Shell>
  )
}
