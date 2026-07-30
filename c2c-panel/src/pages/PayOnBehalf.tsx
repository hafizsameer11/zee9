import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, TopBar, fmt } from '../components/ui'
import { useStore } from '../data/store'

function mmss(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function PayOnBehalf() {
  const nav = useNavigate()
  const {
    payouts,
    availablePayouts,
    claimPayout,
    submitPayout,
    cancelPayout,
    abnormalPayout,
    balance,
    showToast,
    reload,
  } = useStore()
  const [left, setLeft] = useState(9 * 60 + 55)
  const [selId, setSelId] = useState<string | null>(null)
  const [trx, setTrx] = useState('')
  const [busy, setBusy] = useState(false)
  const actionLock = useRef(false)

  const selected = useMemo(() => payouts.find((p) => p.id === selId) ?? payouts[0] ?? null, [payouts, selId])

  useEffect(() => {
    reload()
    const t = window.setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000)
    return () => window.clearInterval(t)
  }, [reload])

  useEffect(() => {
    if (selected && (!selId || !payouts.some((p) => p.id === selId))) {
      setSelId(selected.id)
    }
    if (!selected) setSelId(null)
  }, [selected, selId, payouts])

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    showToast('Copied')
  }

  async function runOnce(fn: () => Promise<void>) {
    if (actionLock.current || busy) return
    actionLock.current = true
    setBusy(true)
    try {
      await fn()
    } finally {
      actionLock.current = false
      setBusy(false)
    }
  }

  async function claim(id: string) {
    await runOnce(async () => {
      try {
        await claimPayout(id)
      } catch (e: any) {
        showToast(e?.message || 'Could not claim — someone else may have taken it')
      }
    })
  }

  async function confirm() {
    if (!selected) return
    if (!trx.trim()) {
      showToast('Enter Transfer ID')
      return
    }
    await runOnce(async () => {
      try {
        await submitPayout(selected.id, trx.trim())
        setTrx('')
      } catch (e: any) {
        showToast(e?.message || 'Confirm failed')
      }
    })
  }

  async function onCancel() {
    if (!selected) return
    await runOnce(async () => {
      try {
        await cancelPayout(selected.id)
        setTrx('')
      } catch (e: any) {
        showToast(e?.message || 'Cancel failed')
      }
    })
  }

  async function onAbnormal() {
    if (!selected) return
    await runOnce(async () => {
      try {
        await abnormalPayout(selected.id)
        setTrx('')
      } catch (e: any) {
        showToast(e?.message || 'Abnormal failed')
      }
    })
  }

  /* Full-screen claimed payout */
  if (selected) {
    return (
      <Shell>
        <StatusBar />
        <TopBar
          title="Withdraw"
          onBack={() => nav('/')}
          face={false}
          right={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span className="pob-timer">{mmss(left)}</span>
              <button
                type="button"
                className="tb-btn"
                aria-label="Withdraw history"
                title="Withdraw history"
                onClick={() => nav('/withdraw-history')}
                style={{ fontSize: 18, lineHeight: 1 }}
              >
                &#128340;
              </button>
            </span>
          }
        />

        <div className="pob-screen">
          {payouts.length > 1 && (
            <div className="pob-tabs" style={{ padding: '10px 14px 0' }}>
              {payouts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={'pob-tab' + (selected.id === p.id ? ' active' : '')}
                  onClick={() => {
                    setSelId(p.id)
                    setTrx('')
                  }}
                >
                  {fmt(p.amount)}
                </button>
              ))}
            </div>
          )}

          <div className="pob-screen-body">
            <div className="pob-step">Step 1. Pay this player from your JazzCash / Easypaisa</div>
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
                <span className="il-v" style={k === 'Account Title:' || k === 'Method:' ? { color: 'var(--violet)' } : undefined}>
                  {v}
                </span>
                {copyable && (
                  <button type="button" className="il-copy pob-copy" onClick={() => copy(v)}>
                    copy
                  </button>
                )}
              </div>
            ))}
            <div className="pob-warn">
              Transfer the exact amount. On confirm, Rs {fmt(selected.amount)} is deducted from your balance and you earn Rs{' '}
              {fmt(selected.reward)}.
            </div>

            <div className="pob-step">Step 2. Enter Transfer ID after paying</div>
            <input
              className="mb-input"
              placeholder="Transfer ID"
              value={trx}
              onChange={(e) => setTrx(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="pob-footer">
            <button type="button" className="pob-fbtn pob-fbtn-cancel" disabled={busy} onClick={() => void onCancel()}>
              Cancel
            </button>
            <button type="button" className="pob-fbtn pob-fbtn-abnormal" disabled={busy} onClick={() => void onAbnormal()}>
              Abnormal
            </button>
            <button type="button" className="pob-fbtn pob-fbtn-confirm" disabled={busy} onClick={() => void confirm()}>
              {busy ? '…' : 'Confirm'}
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  /* Queue — claim open withdraw requests */
  return (
    <Shell>
      <StatusBar />
      <TopBar
        title="Withdraw"
        onBack={() => nav('/')}
        face={false}
        right={
          <button
            type="button"
            className="tb-btn"
            aria-label="Withdraw history"
            title="Withdraw history"
            onClick={() => nav('/withdraw-history')}
            style={{ fontSize: 18, lineHeight: 1 }}
          >
            &#128340;
          </button>
        }
      />

      <div className="scroll pad">
        {availablePayouts.length > 0 ? (
          <>
            <div className="order-list-title">OPEN REQUESTS</div>
            {availablePayouts.map((w) => (
              <div className="card pob-claim" key={w.id}>
                <div className="pob-claim-row">
                  <div>
                    <div className="pob-claim-amt">Rs {fmt(w.amount)}</div>
                    <div className="pob-claim-meta">
                      {w.playerName} · {w.method} · {w.payeeAccount || '—'}
                    </div>
                  </div>
                  <button
                    className="btn btn-violet"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    disabled={busy || balance < w.amount}
                    onClick={() => claim(w.id)}
                  >
                    {balance < w.amount ? 'Need balance' : 'Claim'}
                  </button>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="pob-empty">
            <div className="pob-empty-ico">&#128203;</div>
            <div className="pob-empty-text">No withdraw requests</div>
          </div>
        )}
      </div>
    </Shell>
  )
}
