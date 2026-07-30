import { Shell, StatusBar, TopBar, fmt } from '../components/ui'
import { useStore } from '../data/store'
import { useEffect, useState } from 'react'
import { api } from '../api/client'

type Channel = {
  id: string
  method: string
  accountNumber: string
  accountTitle: string
  bankName?: string | null
  instructions?: string | null
  minAmount?: number
  maxAmount?: number
}

const FLOAT_MIN = 10_000

export default function Balance() {
  const { balance, freeze, transactions, earnings, showToast, reload } = useStore()
  const [busy, setBusy] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelId, setChannelId] = useState('')
  const [amount, setAmount] = useState(FLOAT_MIN)
  const [sender, setSender] = useState('')
  const [trxId, setTrxId] = useState('')
  const [topups, setTopups] = useState<any[]>([])

  useEffect(() => {
    api
      .get('/agent/float/channels')
      .then((list: Channel[]) => {
        setChannels(list)
        setChannelId(list[0]?.id ?? '')
        const min = Math.max(FLOAT_MIN, list[0]?.minAmount ?? FLOAT_MIN)
        setAmount(min)
      })
      .catch(() => {
        setChannels([])
        setChannelId('')
      })
    api
      .get('/agent/float/topups')
      .then((list: any[]) => setTopups(list.slice(0, 8)))
      .catch(() => setTopups([]))
  }, [])

  async function submitTopup() {
    if (!channelId) {
      showToast('No bank account available — ask admin')
      return
    }
    const min = Math.max(FLOAT_MIN, selected?.minAmount ?? FLOAT_MIN)
    if (amount < min) {
      showToast(`Minimum top-up is Rs ${min.toLocaleString('en-PK')}`)
      return
    }
    if (sender.trim().length < 3 || !trxId.trim()) {
      showToast('Enter your account number and Transfer ID')
      return
    }
    setBusy(true)
    try {
      await api.post('/agent/float/topup', {
        amount,
        channelId,
        senderAccount: sender.trim(),
        trxId: trxId.trim(),
      })
      showToast('Top-up submitted — waiting for admin confirmation')
      setTrxId('')
      reload()
      const list = await api.get('/agent/float/topups')
      setTopups(list.slice(0, 8))
    } catch (e: any) {
      showToast(e?.message || 'Top-up failed')
    } finally {
      setBusy(false)
    }
  }

  const selected = channels.find((c) => c.id === channelId)
  const minAmt = Math.max(FLOAT_MIN, selected?.minAmount ?? FLOAT_MIN)

  return (
    <Shell>
      <StatusBar />
      <TopBar title="Balance" />
      <div className="scroll pad">
        <div className="card deposit-balance">
          <div style={{ fontSize: 12, opacity: 0.85 }}>Merchant float (working balance)</div>
          <div className="db-num">{fmt(balance)}</div>
          <div className="db-freeze">Freeze: {fmt(freeze)}</div>
        </div>

        <div className="card" style={{ marginTop: 16, padding: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Earnings (2% rewards)</div>
          <div style={{ fontSize: 13 }}>
            <div className="muted">Lifetime rewards (already in float)</div>
            <b style={{ fontSize: 20 }}>{fmt(earnings.total)}</b>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Deposit / withdraw rewards credit your <b>main float instantly</b> — no lock, no wait.
          </p>
        </div>

        <div className="card" style={{ marginTop: 16, padding: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Top up float</div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
            Send a bank transfer to the account below (minimum Rs {minAmt.toLocaleString('en-PK')}), then submit.
            Admin confirms and credits your float. JazzCash / Easypaisa are not used for float top-up.
          </p>

          {channels.length > 1 && (
            <div style={{ marginBottom: 10 }}>
              <label className="muted" style={{ fontSize: 12 }}>Bank account</label>
              <select
                value={channelId}
                onChange={(e) => {
                  setChannelId(e.target.value)
                  const ch = channels.find((c) => c.id === e.target.value)
                  setAmount(Math.max(FLOAT_MIN, ch?.minAmount ?? FLOAT_MIN))
                }}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
              >
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.bankName || 'Bank') + ' · ' + c.accountTitle + ' · ' + c.accountNumber}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selected ? (
            <div style={{ background: '#f6f6fb', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 13 }}>
              <div className="muted" style={{ fontSize: 11 }}>Bank account</div>
              {selected.bankName && <div style={{ marginTop: 2 }}>{selected.bankName}</div>}
              <div>
                <b>{selected.accountTitle}</b>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 16, marginTop: 4 }}>{selected.accountNumber}</div>
              {selected.instructions && (
                <div className="muted" style={{ marginTop: 6 }}>
                  {selected.instructions}
                </div>
              )}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 12 }}>No bank account configured yet — ask admin.</p>
          )}

          <label className="muted" style={{ fontSize: 12 }}>Amount (Rs) — min {minAmt.toLocaleString('en-PK')}</label>
          <input
            type="number"
            min={minAmt}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={{ width: '100%', marginBottom: 8, padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          />
          <label className="muted" style={{ fontSize: 12 }}>Your account number (sender)</label>
          <input
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            placeholder="Your bank account / IBAN"
            style={{ width: '100%', marginBottom: 8, padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          />
          <label className="muted" style={{ fontSize: 12 }}>Transfer ID / Reference</label>
          <input
            value={trxId}
            onChange={(e) => setTrxId(e.target.value)}
            placeholder="Bank transfer reference"
            style={{ width: '100%', marginBottom: 12, padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          />
          <button className="btn btn-violet btn-block" disabled={busy || !channelId} onClick={submitTopup}>
            {busy ? '…' : 'Submit float top-up'}
          </button>
          {topups.length > 0 && (
            <div style={{ marginTop: 14, fontSize: 12 }}>
              <div className="muted" style={{ marginBottom: 6 }}>Recent top-ups</div>
              {topups.map((t) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>Rs {fmt(Number(t.amount) / 100)}</span>
                  <span>{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="section-label" style={{ marginTop: 24 }}>
          ACCOUNT DETAILS
        </div>
        <div className="card table">
          <div className="thead">
            <div>Transaction Type</div>
            <div className="c-amt">Amount</div>
            <div className="c-time">Time</div>
          </div>
          {transactions.map((t) => (
            <div className="trow" key={t.id}>
              <div>{t.type}</div>
              <div className="c-amt">{fmt(t.amount)}</div>
              <div className="c-time">{t.time}</div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="trow">
              <div className="muted" style={{ textAlign: 'center', width: '100%' }}>
                No records
              </div>
            </div>
          )}
        </div>
        <div style={{ height: 24 }} />
      </div>
    </Shell>
  )
}
