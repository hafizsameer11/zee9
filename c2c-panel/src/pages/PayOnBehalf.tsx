import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, fmt } from '../components/ui'
import { useStore } from '../data/store'

function mmss(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function PayOnBehalf() {
  const nav = useNavigate()
  const { payouts, submitPayout, showToast } = useStore()
  const [left, setLeft] = useState(9 * 60 + 55)
  const [selId, setSelId] = useState<string | null>(null)
  const [trx, setTrx] = useState('')
  const [acct, setAcct] = useState('')
  const [busy, setBusy] = useState(false)

  const selected = useMemo(() => payouts.find((p) => p.id === selId) ?? payouts[0], [payouts, selId])

  useEffect(() => {
    const t = window.setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000)
    return () => window.clearInterval(t)
  }, [])

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    showToast('Copied')
  }

  async function submit() {
    if (!selected) return
    if (!trx.trim() || acct.trim().length < 3) {
      showToast('Enter Transfer ID and your account number')
      return
    }
    setBusy(true)
    try {
      await submitPayout(selected.id, trx.trim(), acct.trim())
      setTrx('')
      setAcct('')
      nav('/')
    } catch (e: any) {
      showToast(e?.message || 'Submit failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell className="maroon-shell">
      <StatusBar dark />
      <div className="pay-header">
        <button className="tb-btn" style={{ position: 'absolute', left: 14 }} onClick={() => nav('/')} aria-label="Back">
          &#8249;
        </button>
        Pay On Behalf
        {selected && <span className="timer">{mmss(left)}</span>}
      </div>

      <div className="scroll maroon-body">
        <div className="mb-inner">
          {!selected ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '60px 0' }}>
              <div style={{ fontSize: 46, opacity: 0.4 }}>&#128176;</div>
              <div style={{ marginTop: 12 }}>No payout orders assigned</div>
            </div>
          ) : (
            <>
              {payouts.length > 1 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
                  {payouts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelId(p.id)}
                      style={{
                        flex: 'none',
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: '1.5px solid ' + (selected.id === p.id ? '#7c1620' : '#e3e3ef'),
                        background: selected.id === p.id ? '#7c1620' : '#fff',
                        color: selected.id === p.id ? '#fff' : '#333',
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {fmt(p.amount)}
                    </button>
                  ))}
                </div>
              )}

              <div className="mb-step-title">Step 1. Pay this player</div>
              {(
                [
                  ['Amount:', fmt(selected.amount), true],
                  ['Reward:', fmt(selected.reward), false],
                  ['Method:', selected.method, false],
                  ['Account No.:', selected.payeeAccount, true],
                  ['Account Title:', selected.payeeName, false],
                ] as [string, string, boolean][]
              ).map(([k, v, copyable]) => (
                <div className="info-line" key={k}>
                  <span className="il-k">{k}</span>
                  <span className="il-v" style={k === 'Account Title:' || k === 'Method:' ? { color: '#7c1620' } : undefined}>
                    {v}
                  </span>
                  {copyable && (
                    <button className="il-copy" onClick={() => copy(v)}>
                      copy
                    </button>
                  )}
                </div>
              ))}
              <div className="mb-warn">
                &#9888; Transfer the exact amount to the payee from your own account. You are reimbursed + reward on submit.
              </div>

              <div className="mb-step-title">Step 2. Open your bank app and transfer to the payee account</div>

              <div className="mb-step-title">Step 3. After the transfer, fill your Transfer ID below</div>
              <input className="mb-input" placeholder="Transfer ID" value={trx} onChange={(e) => setTrx(e.target.value)} />

              <div className="mb-label">Your bank account number just used</div>
              <input className="mb-input" placeholder="Your Account Number" value={acct} onChange={(e) => setAcct(e.target.value)} />

              <button className="mb-submit" onClick={submit} disabled={busy}>
                {busy ? 'Submitting…' : 'Submit payment'}
              </button>
            </>
          )}
        </div>
      </div>
    </Shell>
  )
}
