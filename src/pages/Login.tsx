import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayerAuth } from '../api/auth'
import { captureReferral, clearReferral, getReferral } from '../api/referral'
import styles from './Login.module.css'

export default function Login() {
  const navigate = useNavigate()
  const { login, register, blocked } = usePlayerAuth()
  const captured = getReferral()
  const [mode, setMode] = useState<'login' | 'register'>(
    captured.playerId || captured.shareCode || captured.channel ? 'register' : 'login',
  )
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [referral, setReferral] = useState(captured.playerId || captured.shareCode || '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    captureReferral()
    const capturedNow = getReferral()
    if (capturedNow.playerId || capturedNow.shareCode) {
      setReferral(capturedNow.playerId || capturedNow.shareCode || '')
    }
  }, [])

  async function submit() {
    setErr('')
    if (phone.trim().length < 7 || password.length < 6) {
      setErr('Enter a valid phone and 6+ char password')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(phone.trim(), password)
      } else {
        if (name.trim().length < 2) {
          setErr('Enter your name')
          setBusy(false)
          return
        }
        const code = referral.trim()
        const playerId =
          captured.playerId ||
          (/^\d{6,10}$/.test(code) ? code : undefined)
        await register(phone.trim(), password, name.trim(), {
          playerId,
          shareCode: code || captured.shareCode || captured.playerId || undefined,
          referralCode:
            captured.bindCode || (code && !/^\d{6,10}$/.test(code) ? code : undefined),
          channel: captured.channel,
          bindCode: captured.bindCode,
        })
        clearReferral()
      }
      navigate('/home')
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.crown} style={{ fontSize: 34 }}>👑</div>
      <h1 style={{ fontSize: 22 }}>Zee9</h1>

      <div style={{ display: 'flex', gap: 4, margin: '6px 0 10px' }}>
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setErr('') }}
            style={{
              padding: '6px 18px',
              borderRadius: 6,
              border: '1px solid #8b6914',
              background: mode === m ? 'linear-gradient(180deg,#ffb300,#e65100)' : 'transparent',
              color: mode === m ? '#fff' : '#f5c842',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {m === 'login' ? 'Login' : 'Register'}
          </button>
        ))}
      </div>

      {mode === 'register' && (
        <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
      )}
      <input type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {mode === 'register' && (
        <input
          placeholder="Player ID / referral code"
          value={referral}
          onChange={(e) => setReferral(e.target.value)}
        />
      )}
      {mode === 'register' && (captured.playerId || captured.channel) && (
        <p style={{ color: '#8bd98b', fontSize: 11, margin: 0 }}>
          ✓ Invited
          {captured.playerId ? (
            <>
              {' '}
              by player <b>{captured.playerId}</b>
            </>
          ) : null}
          {captured.channel ? (
            <>
              {' '}
              via channel <b>{captured.channel}</b>
            </>
          ) : null}
        </p>
      )}

      {(err || blocked) && (
        <p style={{ color: '#ff8a80', fontSize: 11, maxWidth: 240, textAlign: 'center' }}>{err || blocked}</p>
      )}

      <button type="button" onClick={submit} disabled={busy}>
        {busy ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
      </button>
    </div>
  )
}
