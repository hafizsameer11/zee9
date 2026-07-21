import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, TopBar, Toggle, Modal, fmt } from '../components/ui'
import { useStore } from '../data/store'

export default function Collections() {
  const nav = useNavigate()
  const { balance, freeze, collectionsOn, setCollectionsOn, orders: allOrders, accounts } = useStore()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [numberFilter, setNumberFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState<'' | 'Jazzcash' | 'Easypaisa'>('')

  const activeNumbers = useMemo(
    () => accounts.filter((a) => a.on).map((a) => `${a.method}: ${a.number}`),
    [accounts],
  )

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
          <span className="wr-k">Active numbers</span>
          <span className="wr-v">{activeNumbers.length ? activeNumbers.join(' · ') : 'None — tap to set'} &#8250;</span>
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
              <option key={n} value={n}>{n}</option>
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

        <div className="order-list-title">DEPOSIT QUEUE</div>

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
          orders.map((o) => (
            <div className="card collect-order" key={o.id}>
              <div className="co-lines">
                <div className="oc-line">
                  <span className="k">{o.method}</span>
                  <span className="v">{fmt(o.amount)}</span>
                </div>
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
                <button className="btn btn-outline btn-sm" onClick={() => setConfirmId(o.id)}>
                  Open
                </button>
                <span className="status processing">{o.status}</span>
              </div>
            </div>
          ))
        )}
        <div style={{ height: 24 }} />
      </div>

      {confirmId && (
        <Modal
          body={
            <>
              Review this deposit carefully. Confirm only after you have received the exact amount on the number shown.
            </>
          }
          onCancel={() => setConfirmId(null)}
          onOk={() => {
            const id = confirmId
            setConfirmId(null)
            nav('/order/' + id)
          }}
        />
      )}
    </Shell>
  )
}
