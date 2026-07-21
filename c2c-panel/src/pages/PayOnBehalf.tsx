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
  const { payouts, availablePayouts, claimPayout, submitPayout, balance, showToast, reload } = useStore()
  const [left, setLeft] = useState(9 * 60 + 55)
  const [selId, setSelId] = useState<string | null>(null)
  const [trx, setTrx] = useState('')
  const [acct, setAcct] = useState('')
  const [busy, setBusy] = useState(false)

  const selected = useMemo(() => payouts.find((p) => p.id === selId) ?? payouts[0], [payouts, selId])

  useEffect(() => {
    reload()
    const t = window.setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000)
    return () => window.clearInterval(t)
  }, [reload])

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    showToast('Copied')
  }

  async function claim(id: string) {
    setBusy(true)
    try {
      await claimPayout(id)
    } catch (e: any) {
      showToast(e?.message || 'Could not claim — someone else may have taken it')
    } finally {
      setBusy(false)
    }
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
          <div style={{ marginBottom: 14, padding: '10px 12px', background: '#fff', borderRadius: 10, fontSize: 13 }}>
            Your float: <b>Rs {fmt(balance)}</b>
            <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>
              Claiming a request locks it for you. Paying cuts the amount from your float; you earn 2% reward.
            </div>
          </div>

          {availablePayouts.length > 0 && (
            <>
              <div className="mb-step-title">Open requests — first claim wins</div>
              {availablePayouts.map((w) => (
                <div
                  key={w.id}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 10,
                    border: '1px solid #e8e8f0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>Rs {fmt(w.amount)}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {w.playerName} · {w.method} · {w.payeeAccount || '—'}
                      </div>
                    </div>
                    <button
                      className="btn btn-violet"
                      style={{ padding: '8px 14px', fontSize: 13 }}
                      disabled={busy || balance < w.amount}
                      onClick={() => claim(w.id)}
                    >
                      {balance < w.amount ? 'Need float' : 'Claim'}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {!selected ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>
              <div style={{ fontSize: 46, opacity: 0.4 }}>&#128176;</div>
              <div style={{ marginTop: 12 }}>
                {availablePayouts.length === 0 ? 'No open withdrawal requests' : 'Claim a request above to pay'}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-step-title">Your claimed payout</div>
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

              <div className="mb-step-title">Step 1. Pay this player from your JazzCash / Easypaisa</div>
              {(
                [
                  ['Amount:', fmt(selected.amount), true],
                  ['Your reward:', fmt(selected.reward), false],
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
                &#9888; Transfer the exact amount. On submit, Rs {fmt(selected.amount)} is cut from your float and you earn Rs {fmt(selected.reward)}.
              </div>

              <div className="mb-step-title">Step 2. Fill Transfer ID after paying</div>
              <input className="mb-input" placeholder="Transfer ID" value={trx} onChange={(e) => setTrx(e.target.value)} />

              <div className="mb-label">Your account number used</div>
              <input className="mb-input" placeholder="Your Account Number" value={acct} onChange={(e) => setAcct(e.target.value)} />

              <button className="mb-submit" onClick={submit} disabled={busy}>
                {busy ? 'Submitting…' : 'Confirm paid'}
              </button>
            </>
          )}
        </div>
      </div>
    </Shell>
  )
}
