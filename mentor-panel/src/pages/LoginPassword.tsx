import { useState } from 'react'
import { Shell, StatusBar, TopBar } from '../components/ui'
import { useStore } from '../data/store'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function LoginPassword() {
  const { showToast } = useStore()
  const nav = useNavigate()
  const [oldP, setOld] = useState('')
  const [newP, setNew] = useState('')
  const [conf, setConf] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!oldP || newP.length < 6 || newP !== conf) {
      showToast('Passwords do not match (min 6 chars)')
      return
    }
    setBusy(true)
    try {
      await api.post('/auth/change-password', { oldPassword: oldP, newPassword: newP })
      showToast('Password updated')
      nav(-1)
    } catch (e: any) {
      showToast(e?.message || 'Failed to change password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <StatusBar />
      <TopBar title="Login Password" />
      <div className="scroll pad">
        <div className="field">
          <label>PLEASE ENTER THE OLD PASSWORD:</label>
          <input type="password" value={oldP} onChange={(e) => setOld(e.target.value)} />
        </div>
        <div className="field">
          <label>PLEASE ENTER A NEW PASSWORD:</label>
          <input type="password" value={newP} onChange={(e) => setNew(e.target.value)} />
        </div>
        <div className="field">
          <label>PLEASE CONFIRM THE NEW PASSWORD AGAIN:</label>
          <input type="password" value={conf} onChange={(e) => setConf(e.target.value)} />
        </div>
        <div style={{ height: 20 }} />
        <button className="btn btn-gold btn-block" onClick={submit} disabled={busy}>
          {busy ? 'Updating…' : 'Confirm'}
        </button>
      </div>
    </Shell>
  )
}
