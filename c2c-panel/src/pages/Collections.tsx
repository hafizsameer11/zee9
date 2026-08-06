import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, TopBar, Toggle, fmt } from '../components/ui'
import { useStore } from '../data/store'
import { confirmRemainSec, mmss, payRemainSec, shouldShowConfirmCountdown, shouldShowPayCountdown } from '../lib/confirmWindow'

export default function Collections() {
  const nav = useNavigate()
  const { balance, freeze, collectionsOn, setCollectionsOn, orders: allOrders, accounts } = useStore()
  const [numberFilter, setNumberFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState<'' | 'Jazzcash' | 'Easypaisa'>('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const activeAccount = useMemo(() => accounts.find((a) => a.on) ?? null, [accounts])

  const numberOptions = useMemo(() => {
    const fromAcc = accounts.map((a) => a.number)
    const fromOrd = allOrders.map((o) => o.collectionAccount).filter(Boolean)
    return Array.from(new Set([...fromAcc, ...fromOrd]))
  }, [accounts, allOrders])

  const orders = allOrders.filter((o) => {
    if (!(o.status === 'pending' || o.status === 'processing' || o.status === 'checking')) return false
    if (o.type !== 'DEPOSIT') return false
    if (numberFilter && o.collectionAccount !== numberFilter) return false
    if (methodFilter && o.method !== methodFilter) return false
    return true
  })

  return (
    <Shell>
      <StatusBar />
      <TopBar title="Collections" onBack={() => nav('/')} />
      <div className="scroll pad">
        <div className="card balance-card">
          <div className="balance-col">
            <h3>Balance</h3>
            <div className="num">{fmt(balance)}</div>
          </div>
          <div className="balance-col">
            <h3>Freeze Funds</h3>
            <div className="num gold">{fmt(freeze)}</div>
          </div>
        </div>

        <div className="card collect-toggle-card">
          <span className="ct-label">Collections</span>
          <Toggle on={collectionsOn} onChange={() => setCollectionsOn(!collectionsOn)} />
        </div>

        <div className="card wallet-row" onClick={() => nav('/accounts')} style={{ cursor: 'pointer' }}>
          <span className="wr-k">Wallet Account</span>
          <span className="wr-v">
            {!collectionsOn
              ? 'Collections off'
              : activeAccount
                ? activeAccount.number
                : 'None — tap to set'}{' '}
            &#8250;
          </span>
        </div>

        <div className="filter-row" style={{ marginTop: 12 }}>
          <select
            className="filter-pill"
            style={{ appearance: 'auto', paddingRight: 8 }}
            value={numberFilter}
            onChange={(e) => setNumberFilter(e.target.value)}
          >
            <option value="">All numbers</option>
            {numberOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            className="filter-pill"
            style={{ appearance: 'auto', paddingRight: 8 }}
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as '' | 'Jazzcash' | 'Easypaisa')}
          >
            <option value="">All methods</option>
            <option value="Jazzcash">JazzCash</option>
            <option value="Easypaisa">Easypaisa</option>
          </select>
        </div>

        <div className="details-head">
          <div className="order-list-title" style={{ margin: 0 }}>
            DEPOSIT QUEUE
          </div>
          <div className="link" onClick={() => nav('/orders')} style={{ cursor: 'pointer' }}>
            more
          </div>
        </div>

        {!collectionsOn ? (
          <div className="card empty">
            <div className="e-ico">&#128721;</div>
            Collections are turned off
          </div>
        ) : orders.length === 0 ? (
          <div className="card empty">
            <div className="e-ico">&#128203;</div>
            No deposits for this filter
          </div>
        ) : (
          orders.map((o) => {
            const showConfirm = shouldShowConfirmCountdown(o.status, o.submittedAt)
            const showPay = shouldShowPayCountdown(o.status, o.submittedAt, o.trxId)
            const confirmLeft = showConfirm ? confirmRemainSec(o.submittedAt, now) : 0
            const payLeft = showPay ? payRemainSec(o.createdAt || o.time.replace(' ', 'T'), now) : 0
            return (
              <div className="card collect-order" key={o.id}>
                <div className="co-lines">
                  <div className="oc-line">
                    <span className="k">{o.method}</span>
                    <span className="v">{fmt(o.amount)}</span>
                  </div>
                  {showPay && (
                    <div className="oc-line">
                      <span className="k">TRX WAIT</span>
                      <span className="ol-timer">{mmss(payLeft)}</span>
                    </div>
                  )}
                  {showConfirm && (
                    <div className="oc-line">
                      <span className="k">CONFIRM</span>
                      <span className="ol-timer">{mmss(confirmLeft)}</span>
                    </div>
                  )}
                  {(o.collectionHolder || o.playerName) && (
                    <div className="oc-line">
                      <span className="k">NAME</span>
                      <span className="v">{o.collectionHolder || o.playerName}</span>
                    </div>
                  )}
                  <div className="oc-line">
                    <span className="k">YOUR NUMBER</span>
                    <span className="v">{o.collectionAccount || '—'}</span>
                  </div>
                  <div className="oc-line">
                    <span className="k">REWARD</span>
                    <span className="v gold">{fmt(o.reward)}</span>
                  </div>
                </div>
                <div className="oc-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => nav('/order/' + o.id)}>
                    Open
                  </button>
                  <span className="status processing">{o.status}</span>
                </div>
              </div>
            )
          })
        )}
        <div style={{ height: 24 }} />
      </div>
    </Shell>
  )
}
