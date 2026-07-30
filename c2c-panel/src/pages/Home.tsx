import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, Sheet, fmt } from '../components/ui'
import { api } from '../api/client'
import { useStore, type StatGroup } from '../data/store'

type TabKey = 'today' | 'week' | 'month' | 'custom'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function todayEnd() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function Home() {
  const nav = useNavigate()
  const { balance, freeze, orders, payouts, stats, transactions } = useStore()
  const [tab, setTab] = useState<TabKey>('today')
  const [customOpen, setCustomOpen] = useState(false)
  const [from, setFrom] = useState(isoDate(daysAgo(7)))
  const [to, setTo] = useState(isoDate(new Date()))
  const [customStats, setCustomStats] = useState<StatGroup | null>(null)
  const [customBusy, setCustomBusy] = useState(false)

  const s = tab === 'custom' && customStats ? customStats : stats[tab === 'custom' ? 'today' : tab]

  const range = useMemo(() => {
    if (tab === 'today') return { from: daysAgo(0), to: todayEnd() }
    if (tab === 'week') return { from: daysAgo(6), to: todayEnd() }
    if (tab === 'month') return { from: daysAgo(29), to: todayEnd() }
    const f = new Date(`${from}T00:00:00`)
    const t = new Date(`${to}T23:59:59`)
    return {
      from: Number.isNaN(f.getTime()) ? daysAgo(6) : f,
      to: Number.isNaN(t.getTime()) ? todayEnd() : t,
    }
  }, [tab, from, to])

  const openOrders = orders.filter((o) => o.status === 'pending' || o.status === 'processing' || o.status === 'checking')
  const details = transactions.filter((t) => {
    const d = new Date(t.time.replace(' ', 'T'))
    if (Number.isNaN(d.getTime())) return true
    return d >= range.from && d <= range.to
  }).slice(0, 8)

  useEffect(() => {
    if (tab !== 'custom') return
    setCustomBusy(true)
    api
      .get(`/agent/stats?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((data: { custom?: Record<string, number> }) => {
        const raw = data.custom ?? { colAmount: 0, colReward: 0, payAmount: 0, payReward: 0 }
        setCustomStats({
          colAmount: Number(raw.colAmount ?? 0) / 100,
          colReward: Number(raw.colReward ?? 0) / 100,
          payAmount: Number(raw.payAmount ?? 0) / 100,
          payReward: Number(raw.payReward ?? 0) / 100,
        })
      })
      .catch(() => setCustomStats({ colAmount: 0, colReward: 0, payAmount: 0, payReward: 0 }))
      .finally(() => setCustomBusy(false))
  }, [tab, from, to])

  async function applyCustom() {
    setTab('custom')
    setCustomOpen(false)
  }

  return (
    <Shell>
      <StatusBar />
      <div className="topbar">
        <button className="tb-btn" onClick={() => nav('/profile')} aria-label="Menu">
          &#9776;
        </button>
        <span className="tb-spacer" />
        <span className="tb-face" onClick={() => nav('/profile')}>
          &#9786;
        </span>
      </div>

      <div className="scroll pad">
        <div className="section-label">EARNINGS</div>

        <div className="card balance-card">
          <div className="balance-col">
            <h3>Balance</h3>
            <div className="num">{fmt(balance)}</div>
            <div className="sub violet" onClick={() => nav('/balance')}>
              Deposit/Withdraw&gt;&gt;
            </div>
          </div>
          <div className="balance-col">
            <h3>Freeze Funds</h3>
            <div className="num gold">{fmt(freeze)}</div>
            <div className="sub gold" onClick={() => nav('/orders')}>
              To Deal With&gt;&gt;
            </div>
          </div>
        </div>

        <div className="card tabs-card">
          <div className="tabs">
            {(['today', 'week', 'month'] as const).map((t) => (
              <div
                key={t}
                role="button"
                tabIndex={0}
                className={'tab' + (tab === t ? ' active' : '')}
                onClick={() => setTab(t)}
                onKeyDown={(e) => e.key === 'Enter' && setTab(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </div>
            ))}
            <div
              role="button"
              tabIndex={0}
              className={'tab-customize' + (tab === 'custom' ? ' active' : '')}
              onClick={() => setCustomOpen(true)}
              onKeyDown={(e) => e.key === 'Enter' && setCustomOpen(true)}
              style={tab === 'custom' ? { color: '#5b2be0', fontWeight: 800 } : undefined}
            >
              {tab === 'custom' ? `${from.slice(5)}–${to.slice(5)}` : 'Customize'}
            </div>
          </div>
          <div className="stat-split">
            <div className="stat-group">
              <div className="cap">COLLECTIONS {customBusy ? '…' : ''}</div>
              <div className="stat-pair">
                <div className="stat-item">
                  <div className="v">{fmt(s.colAmount)}</div>
                  <div className="k">Amount</div>
                </div>
                <div className="stat-item">
                  <div className="v gold">{fmt(s.colReward)}</div>
                  <div className="k">Rewards</div>
                </div>
              </div>
            </div>
            <div className="stat-group">
              <div className="cap">PAYMENT</div>
              <div className="stat-pair">
                <div className="stat-item">
                  <div className="v">{fmt(s.payAmount)}</div>
                  <div className="k">Amount</div>
                </div>
                <div className="stat-item">
                  <div className="v gold">{fmt(s.payReward)}</div>
                  <div className="k">Rewards</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="action-row">
          <button className="action-btn gold" onClick={() => nav('/collections')}>
            <span className="ab-icon">&#8646;</span>
            <span className="ab-label">Collections</span>
            {openOrders.length > 0 && <span className="badge">{openOrders.length}</span>}
          </button>
          <button className="action-btn orange" onClick={() => nav('/pay-on-behalf')}>
            <span className="ab-icon">&#8631;</span>
            <span className="ab-label">
              Pay
              <br />
              On Behalf
            </span>
            {payouts.length > 0 && <span className="badge">{payouts.length}</span>}
          </button>
        </div>

        <div className="details-head">
          <div className="section-label">ACCOUNT DETAILS</div>
          <div className="link" onClick={() => nav('/payment-info')}>
            more
          </div>
        </div>

        <div className="card table">
          <div className="thead">
            <div>Transaction Type</div>
            <div className="c-amt">Amount</div>
            <div className="c-time">Time</div>
          </div>
          {details.map((t) => (
            <div className="trow" key={t.id}>
              <div>{t.type}</div>
              <div className="c-amt">{fmt(t.amount)}</div>
              <div className="c-time">{t.time.replace(' ', '\n')}</div>
            </div>
          ))}
          {details.length === 0 && (
            <div className="trow">
              <div className="muted" style={{ textAlign: 'center', width: '100%' }}>
                No transactions in this period
              </div>
            </div>
          )}
        </div>
        <div style={{ height: 24 }} />
      </div>

      {customOpen && (
        <Sheet title="Customize Time" onClose={() => setCustomOpen(false)}>
          <div className="pay-block-label" style={{ color: '#222', marginTop: 4 }}>
            Date range
          </div>
          <div className="time-row">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="sheet-foot">
            <button
              className="btn btn-outline"
              onClick={() => {
                setFrom(isoDate(daysAgo(7)))
                setTo(isoDate(new Date()))
              }}
            >
              Reset
            </button>
            <button className="btn btn-violet" onClick={() => void applyCustom()}>
              Confirm
            </button>
          </div>
        </Sheet>
      )}
    </Shell>
  )
}
