import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { absorbAuthFromUrl, api, gameHomeUrl, getAccess, uploadFile } from '../api/client'
import { Shell, TopBar, fmt } from '../components/ui'

type PayInfo = {
  depositId: string
  orderNo: string
  amount: number
  method: string
  status: string
  orderStatus: string
  trxId: string | null
  expiresAt: string
  createdAt?: string
  account: {
    number: string
    title: string
    method: string
    instructions: string[]
  } | null
}

function methodLabel(m: string) {
  if (m === 'JAZZCASH') return 'JazzCash'
  if (m === 'EASYPAISA') return 'Easypaisa'
  return m
}

function formatRemain(ms: number) {
  if (ms <= 0) return '00:00'
  const s = Math.ceil(ms / 1000)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function goLobby() {
  window.location.href = gameHomeUrl()
}

export default function PaymentPage() {
  const { orderNo: paramOrder } = useParams()
  const [qs] = useSearchParams()
  const orderNo = paramOrder || qs.get('orderNo') || ''

  const [info, setInfo] = useState<PayInfo | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [trxId, setTrxId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [toast, setToast] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    absorbAuthFromUrl()
  }, [])

  const load = useCallback(async () => {
    if (!orderNo) {
      setErr('Missing order number')
      setLoading(false)
      return
    }
    if (!getAccess()) {
      setErr('Session expired. Open payment again from the game.')
      setLoading(false)
      return
    }
    try {
      const data = await api.get(`/deposits/order/${encodeURIComponent(orderNo)}`)
      setInfo(data)
      if (data.trxId) setTrxId(data.trxId)
      if (data.status !== 'PENDING' || data.trxId) setDone(true)
    } catch (e: any) {
      setErr(e?.message || 'Payment order not found')
    } finally {
      setLoading(false)
    }
  }, [orderNo])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  const remainMs = useMemo(() => {
    if (!info?.expiresAt) return 0
    return new Date(info.expiresAt).getTime() - now
  }, [info, now])

  const expired = remainMs <= 0 && info?.status === 'PENDING' && !done

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    setToast('Copied')
  }

  async function submit() {
    if (!trxId.trim()) {
      setToast('Please enter TRX ID')
      return
    }
    setBusy(true)
    setErr('')
    try {
      let receiptUrl: string | undefined
      if (file) {
        const media = await uploadFile(file)
        receiptUrl = media.url
      }
      await api.patch(`/deposits/order/${encodeURIComponent(orderNo)}`, {
        trxId: trxId.trim(),
        receiptUrl,
      })
      setDone(true)
      setToast('Submitted')
    } catch (e: any) {
      setErr(e?.message || 'Submit failed')
      setToast(e?.message || 'Submit failed')
    } finally {
      setBusy(false)
    }
  }

  const steps = useMemo(() => {
    if (!info) return []
    const ordered = info.createdAt
      ? new Date(info.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '—'
    if (done) {
      return [
        { label: 'Ordered', time: ordered, pendingBar: false, pendingDot: false },
        { label: 'Processing', time: ordered, pendingBar: false, pendingDot: false },
        { label: 'Confirm payment', time: ordered, pendingBar: false, pendingDot: false },
        { label: 'Complete', time: 'Pending', pendingBar: false, pendingDot: true },
      ]
    }
    return [
      { label: 'Ordered', time: ordered, pendingBar: false, pendingDot: false },
      { label: 'Processing', time: ordered, pendingBar: false, pendingDot: false },
      { label: 'Confirm payment', time: '—', pendingBar: true, pendingDot: false },
      { label: 'Complete', time: '—', pendingBar: true, pendingDot: true },
    ]
  }, [info, done])

  if (loading) {
    return (
      <Shell>
        <TopBar title="Payment" onBack={goLobby} />
        <div className="scroll pad">
          <div className="card empty">Loading payment…</div>
        </div>
      </Shell>
    )
  }

  if (err && !info) {
    return (
      <Shell>
        <TopBar title="Payment" onBack={goLobby} />
        <div className="scroll pad">
          <div className="card empty">
            <div className="e-ico">!</div>
            {err}
            <div style={{ height: 16 }} />
            <button type="button" className="btn btn-gold btn-block" onClick={goLobby}>
              Back to lobby
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  if (!info || !info.account) {
    return (
      <Shell>
        <TopBar title="Payment" onBack={goLobby} />
        <div className="scroll pad">
          <div className="card empty">
            <div className="e-ico">&#9989;</div>
            No account assigned
            <div style={{ height: 16 }} />
            <button type="button" className="btn btn-gold btn-block" onClick={goLobby}>
              Back to lobby
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <TopBar
        title="Payment"
        onBack={goLobby}
        right={
          <span style={{ fontWeight: 800, fontSize: 13, color: expired ? '#ffcdd2' : '#fff' }}>
            {expired ? 'Expired' : formatRemain(remainMs)}
          </span>
        }
      />
      <div className="scroll pad">
        <div className="stepper">
          {steps.map((s) => (
            <div className="step" key={s.label}>
              <div className={'bar' + (s.pendingBar ? ' pending' : '')} />
              <div className={'dot' + (s.pendingDot ? ' pending' : '')} />
              <div className="st-label">{s.label}</div>
              <div className="st-time">{s.time}</div>
            </div>
          ))}
        </div>

        <div className="card pay-amount-card">
          <div className="cap">AMOUNT OF PAYMENT</div>
          <div className="amt">
            {fmt(info.amount)}
            <span className="copy-ic" onClick={() => copy(String(info.amount))} role="button" tabIndex={0}>
              &#128203;
            </span>
          </div>
          <div className="warn">The payment amount must be consistent with the order amount.</div>
        </div>

        <div className="pay-block-label">COLLECTION ACCOUNT</div>
        <div className="card copy-card">
          <div className="cc-sub">{methodLabel(info.method)} Account</div>
          <div className="cc-sub" style={{ marginBottom: 4, color: 'var(--ink-2)', fontWeight: 700 }}>
            Account name
          </div>
          <div className="copy-line" style={{ marginBottom: 10 }}>
            <div className="cc-field">{info.account.title}</div>
            <button type="button" className="cc-copy" onClick={() => copy(info.account!.title)}>
              Copy
            </button>
          </div>
          <div className="cc-sub" style={{ marginBottom: 4, color: 'var(--ink-2)', fontWeight: 700 }}>
            Account number
          </div>
          <div className="copy-line">
            <div className="cc-field">{info.account.number}</div>
            <button type="button" className="cc-copy" onClick={() => copy(info.account!.number)}>
              Copy
            </button>
          </div>
        </div>

        {done ? (
          <>
            <div className="pay-block-label">STATUS</div>
            <div className="card copy-card" style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 8, color: 'var(--green)' }}>✓</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#222' }}>Payment submitted</div>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
                Waiting for merchant confirmation. Wallet updates once approved.
              </div>
              {trxId && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--violet)', fontWeight: 700 }}>
                  TRX ID: {trxId}
                </div>
              )}
            </div>
            <div style={{ height: 16 }} />
            <button type="button" className="btn btn-gold btn-block" onClick={goLobby}>
              Back to lobby
            </button>
          </>
        ) : expired ? (
          <>
            <div className="card copy-card" style={{ textAlign: 'center', color: 'var(--red)', fontWeight: 700 }}>
              This payment window has expired. Create a new deposit from the game.
            </div>
            <div style={{ height: 16 }} />
            <button type="button" className="btn btn-gold btn-block" onClick={goLobby}>
              Back to lobby
            </button>
          </>
        ) : (
          <>
            <div className="pay-block-label">TRX ID.</div>
            <div className="card copy-card">
              <div className="copy-line">
                <input
                  className="cc-field"
                  style={{ color: '#4b49c4', textAlign: 'center' }}
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  placeholder="Enter TRX ID"
                />
                <button type="button" className="cc-copy" onClick={() => copy(trxId)}>
                  Copy
                </button>
              </div>
            </div>

            <div className="pay-block-label">SCREENSHOT (OPTIONAL)</div>
            <div className="card copy-card">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={{ width: '100%', fontSize: 13 }}
              />
              {file && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>
                  {file.name}
                </div>
              )}
            </div>

            <div className="pay-block-label">IMPORTANT TIPS</div>
            <div className="card copy-card">
              <div style={{ color: '#b9b9c8', fontSize: 14, lineHeight: 1.8 }}>
                1. Open your {methodLabel(info.method)} app and send the exact amount.
                <br />
                2. Send only to the collection account shown on this page.
                <br />
                3. Copy the Transaction ID (TID) from the success SMS / app.
                <br />
                4. Paste the TID here and submit before the timer ends.
                <br />
                5. A new merchant account is assigned each time you create a deposit.
              </div>
            </div>

            {err && (
              <div style={{ color: 'var(--red)', fontWeight: 700, marginTop: 10, fontSize: 13 }}>{err}</div>
            )}

            <div style={{ height: 16 }} />
            <button type="button" className="btn btn-gold btn-block" disabled={busy} onClick={() => void submit()}>
              {busy ? 'Submitting…' : 'I have paid'}
            </button>
          </>
        )}

        <div style={{ height: 24 }} />
        <div className="order-no" style={{ textAlign: 'center', color: 'rgba(255,255,255,.7)' }}>
          Order {info.orderNo}
        </div>
        <div style={{ height: 24 }} />
      </div>
      {toast && <div className="toast">{toast}</div>}
    </Shell>
  )
}
