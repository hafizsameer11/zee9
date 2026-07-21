import { Shell, StatusBar, TopBar, fmt } from '../components/ui'
import { useStore } from '../data/store'
import { useEffect, useState } from 'react'
import { api } from '../api/client'

type Channel = {
  id: string
  method: string
  accountNumber: string
  accountTitle: string
  instructions?: string | null
}

export default function Balance() {
  const { balance, freeze, transactions, earnings, withdrawEarnings, showToast, reload } = useStore()
  const [busy, setBusy] = useState(false)
  const [method, setMethod] = useState<'JAZZCASH' | 'EASYPAISA'>('JAZZCASH')
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelId, setChannelId] = useState('')
  const [amount, setAmount] = useState(1000)
  const [sender, setSender] = useState('')
  const [trxId, setTrxId] = useState('')
  const [topups, setTopups] = useState<any[]>([])

  useEffect(() => {
    api
      .get(`/agent/float/channels?method=${method}`)
      .then((list: Channel[]) => {
        setChannels(list)
        setChannelId(list[0]?.id ?? '')
      })
      .catch(() => {
        setChannels([])
        setChannelId('')
      })
    api
      .get('/agent/float/topups')
      .then((list: any[]) => setTopups(list.slice(0, 8)))
      .catch(() => setTopups([]))
  }, [method])

  async function unlock() {
    setBusy(true)
    try {
      await withdrawEarnings()
    } catch (e: any) {
      showToast(e?.message || 'Nothing unlocked yet')
    } finally {
      setBusy(false)
    }
  }

  async function submitTopup() {
    if (!channelId) {
      showToast('No platform account available — ask admin')
      return
    }
    if (amount < 300 || sender.trim().length < 3 || !trxId.trim()) {
      showToast('Enter amount, your number, and Transfer ID')
      return
    }
    setBusy(true)
    try {
      await api.post('/agent/float/topup', {
        amount,
        method,
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

  return (
    <Shell>
      <StatusBar />
      <TopBar title="Balance" />
      <div className="scroll pad">
        <div className="card deposit-balance">
          <div style={{ fontSize: 12, opacity: 0.85 }}>Agent float (working balance)</div>
          <div className="db-num">{fmt(balance)}</div>
          <div className="db-freeze">Freeze: {fmt(freeze)}</div>
        </div>

        <div className="card" style={{ marginTop: 16, padding: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Earnings (2% rewards)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 13 }}>
            <div>
              <div className="muted">Total</div>
              <b>{fmt(earnings.total)}</b>
            </div>
            <div>
              <div className="muted">Locked</div>
              <b>{fmt(earnings.locked)}</b>
            </div>
            <div>
              <div className="muted">Available</div>
              <b style={{ color: '#2fbf5b' }}>{fmt(earnings.available)}</b>
            </div>
          </div>
          <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
            Earnings unlock after {earnings.holdDays} day(s) (admin setting). Unlocked amount moves to your float.
          </p>
          <button
            className="btn btn-violet btn-block"
            style={{ marginTop: 12 }}
            disabled={busy || earnings.available <= 0}
            onClick={unlock}
          >
            {busy ? '…' : earnings.available > 0 ? `Withdraw ${fmt(earnings.available)} to float` : 'Nothing unlocked yet'}
          </button>
        </div>

        <div className="card" style={{ marginTop: 16, padding: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Top up float</div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
            Send money to the platform account below, then submit. Admin confirms and credits your float.
            Player deposits you collect never increase this balance — only your 2% reward does.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {(['JAZZCASH', 'EASYPAISA'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={'btn btn-sm ' + (method === m ? 'btn-violet' : 'btn-light')}
                onClick={() => setMethod(m)}
              >
                {m === 'JAZZCASH' ? 'JazzCash' : 'Easypaisa'}
              </button>
            ))}
          </div>
          {selected ? (
            <div style={{ background: '#f6f6fb', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 13 }}>
              <div>
                <b>{selected.accountTitle}</b>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 16, marginTop: 4 }}>{selected.accountNumber}</div>
              {selected.instructions && <div className="muted" style={{ marginTop: 6 }}>{selected.instructions}</div>}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 12 }}>No platform {method} account configured yet.</p>
          )}
          <label className="muted" style={{ fontSize: 12 }}>Amount (Rs)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={{ width: '100%', marginBottom: 8, padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          />
          <label className="muted" style={{ fontSize: 12 }}>Your account number</label>
          <input
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            placeholder="03XXXXXXXXX"
            style={{ width: '100%', marginBottom: 8, padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          />
          <label className="muted" style={{ fontSize: 12 }}>Transfer ID</label>
          <input
            value={trxId}
            onChange={(e) => setTrxId(e.target.value)}
            placeholder="TID / TID"
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
              <div className="muted" style={{ textAlign: 'center', width: '100%' }}>No records</div>
            </div>
          )}
        </div>
        <div style={{ height: 24 }} />
      </div>
    </Shell>
  )
}
