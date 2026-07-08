import { useState } from 'react'
import { Shell, StatusBar, TopBar } from '../components/ui'
import { useStore } from '../data/store'
import { useNavigate } from 'react-router-dom'

export default function LoginPassword() {
  const { showToast } = useStore()
  const nav = useNavigate()
  const [oldP, setOld] = useState('')
  const [newP, setNew] = useState('')
  const [conf, setConf] = useState('')

  function submit() {
    if (!oldP || !newP || newP !== conf) {
      showToast('Passwords do not match')
      return
    }
    showToast('Password updated')
    nav(-1)
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
        <button className="btn btn-gold btn-block" onClick={submit}>
          Confirm
        </button>
      </div>
    </Shell>
  )
}
