import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, fmt } from '../components/ui'
import { useStore } from '../data/store'

type TabKey = 'today' | 'week' | 'month'

export default function Home() {
  const nav = useNavigate()
  const { balance, freeze, orders, payouts, stats, transactions } = useStore()
  const [tab, setTab] = useState<TabKey>('today')
  const s = stats[tab]
  const openOrders = orders.filter((o) => o.status === 'pending' || o.status === 'processing' || o.status === 'checking')
  const details = transactions.slice(0, 6)

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
            {(['today', 'week', 'month'] as TabKey[]).map((t) => (
              <div key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
                {t[0].toUpperCase() + t.slice(1)}
              </div>
            ))}
            <div className="tab-customize">Customize</div>
          </div>
          <div className="stat-split">
            <div className="stat-group">
              <div className="cap">COLLECTIONS</div>
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
              <div className="muted" style={{ textAlign: 'center', width: '100%' }}>No transactions yet</div>
            </div>
          )}
        </div>
        <div style={{ height: 24 }} />
      </div>
    </Shell>
  )
}
