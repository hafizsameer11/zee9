import { useMemo, useState } from 'react'
import { Shell, StatusBar, TopBar, Sheet, fmt } from '../components/ui'
import { useStore } from '../data/store'
import type { CollectionOrder, OrderStatus } from '../data/mock'

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  checking: 'Checking',
  processing: 'Processing',
  success: 'Success',
  fail: 'Fail',
}

type SheetKind = 'number' | 'method' | 'status' | null

export default function OrderList() {
  const { orders, accounts } = useStore()
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [collectionNumber, setCollectionNumber] = useState('')
  const [method, setMethod] = useState<'' | 'Jazzcash' | 'Easypaisa'>('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [type, setType] = useState<'' | 'DEPOSIT' | 'WITHDRAW'>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [detail, setDetail] = useState<CollectionOrder | null>(null)

  const numbers = useMemo(() => {
    const fromAccounts = accounts.map((a) => a.number)
    const fromOrders = orders.map((o) => o.collectionAccount).filter(Boolean)
    return Array.from(new Set([...fromAccounts, ...fromOrders]))
  }, [accounts, orders])

  const filtered = orders.filter((o) => {
    if (collectionNumber && o.collectionAccount !== collectionNumber) return false
    if (method && o.method !== method) return false
    if (status && o.status !== status) return false
    if (type && o.type !== type) return false
    if (from) {
      const d = o.time.slice(0, 10)
      if (d < from) return false
    }
    if (to) {
      const d = o.time.slice(0, 10)
      if (d > to) return false
    }
    return true
  })

  function reset() {
    setCollectionNumber('')
    setMethod('')
    setStatus('')
    setType('')
    setFrom('')
    setTo('')
  }

  const activeFilters = [collectionNumber, method, status, type, from, to].filter(Boolean).length

  return (
    <Shell>
      <StatusBar />
      <TopBar title="Order List" />
      <div className="scroll pad">
        <div className="filter-row">
          <button className="filter-pill" onClick={() => setSheet('number')}>
            {collectionNumber || 'Number'} &#9662;
          </button>
          <button className="filter-pill" onClick={() => setSheet('method')}>
            {method || 'Method'} &#9662;
          </button>
          <button className="filter-pill" onClick={() => setSheet('status')}>
            {status ? STATUS_LABEL[status] : 'Filter'} &#9662;
            {activeFilters > 0 ? ` (${activeFilters})` : ''}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="card empty">
            <div className="e-ico">&#128203;</div>
            No orders
          </div>
        ) : (
          filtered.map((o) => (
            <div className="order-card" key={o.id}>
              <div className="oc-top">
                <div className="order-no">Order No. {o.orderNo}</div>
                <div className="oc-grid">
                  <div className="oc-lines">
                    <div className="oc-line">
                      <span className="k">{o.type}</span>
                      <span className="v">{fmt(o.amount)}</span>
                    </div>
                    <div className="oc-line">
                      <span className="k">REWARD</span>
                      <span className="v gold">{fmt(o.reward)}</span>
                    </div>
                  </div>
                  <div className="oc-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => setDetail(o)}>
                      details
                    </button>
                    <span className={'status ' + o.status}>{STATUS_LABEL[o.status]}</span>
                  </div>
                </div>
              </div>
              <div className="oc-foot">
                <span>{o.method}: {o.collectionAccount || '—'}</span>
                <span>{o.time}</span>
              </div>
            </div>
          ))
        )}
        <div style={{ height: 24 }} />
      </div>

      {sheet === 'number' && (
        <Sheet title="Collection number" onClose={() => setSheet(null)}>
          <div className={'sheet-radio' + (collectionNumber === '' ? ' active' : '')} onClick={() => { setCollectionNumber(''); setSheet(null) }}>
            <span className="sr-k">All numbers</span>
            <span className="sr-dot" />
          </div>
          {numbers.map((a) => (
            <div
              key={a}
              className={'sheet-radio' + (collectionNumber === a ? ' active' : '')}
              onClick={() => {
                setCollectionNumber(a)
                setSheet(null)
              }}
            >
              <span className="sr-k">{a}</span>
              <span className="sr-dot" />
            </div>
          ))}
        </Sheet>
      )}

      {sheet === 'method' && (
        <Sheet title="Method" onClose={() => setSheet(null)}>
          {(['', 'Jazzcash', 'Easypaisa'] as const).map((m) => (
            <div
              key={m || 'all'}
              className={'sheet-radio' + (method === m ? ' active' : '')}
              onClick={() => {
                setMethod(m)
                setSheet(null)
              }}
            >
              <span className="sr-k">{m || 'All methods'}</span>
              <span className="sr-dot" />
            </div>
          ))}
        </Sheet>
      )}

      {sheet === 'status' && (
        <Sheet title="Filter deposits" onClose={() => setSheet(null)}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Status</div>
          <div className="sheet-opts">
            {(['', 'pending', 'checking', 'processing', 'success', 'fail'] as const).map((s) => (
              <button
                key={s || 'all'}
                className={'sheet-opt' + (status === s ? ' active' : '')}
                onClick={() => setStatus(s)}
              >
                {s === '' ? 'All' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 12, margin: '14px 0 8px' }}>Type</div>
          <div className="sheet-opts">
            {(['', 'DEPOSIT', 'WITHDRAW'] as const).map((t) => (
              <button
                key={t || 'all'}
                className={'sheet-opt' + (type === t ? ' active' : '')}
                onClick={() => setType(t)}
              >
                {t === '' ? 'All' : t}
              </button>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 12, margin: '14px 0 8px' }}>Date range</div>
          <div className="time-row">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="sheet-foot">
            <button className="btn btn-outline" onClick={reset}>
              Reset
            </button>
            <button className="btn btn-violet" onClick={() => setSheet(null)}>
              Confirm
            </button>
          </div>
        </Sheet>
      )}

      {detail && (
        <Sheet title="Order Details" onClose={() => setDetail(null)}>
          <div className={'detail-status ' + detail.status}>{STATUS_LABEL[detail.status]}</div>
          <div className="detail-list">
            <div className="detail-row">
              <span className="dr-k">Order No.</span>
              <span className="dr-v">{detail.orderNo}</span>
            </div>
            <div className="detail-row">
              <span className="dr-k">Type</span>
              <span className="dr-v">{detail.type}</span>
            </div>
            <div className="detail-row">
              <span className="dr-k">Amount</span>
              <span className="dr-v strong">{fmt(detail.amount)}</span>
            </div>
            <div className="detail-row">
              <span className="dr-k">Reward</span>
              <span className="dr-v gold-text">{fmt(detail.reward)}</span>
            </div>
            <div className="detail-row">
              <span className="dr-k">Method</span>
              <span className="dr-v">{detail.method}</span>
            </div>
            <div className="detail-row">
              <span className="dr-k">Player account</span>
              <span className="dr-v">{detail.account}</span>
            </div>
            <div className="detail-row">
              <span className="dr-k">Your number</span>
              <span className="dr-v">{detail.collectionAccount}</span>
            </div>
            <div className="detail-row">
              <span className="dr-k">Time</span>
              <span className="dr-v">{detail.time}</span>
            </div>
          </div>
          <button className="btn btn-violet btn-block" onClick={() => setDetail(null)}>
            Close
          </button>
        </Sheet>
      )}
    </Shell>
  )
}
