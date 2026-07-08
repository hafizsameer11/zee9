import { useMemo, useState } from 'react'
import { Shell, StatusBar, TopBar, Sheet, fmt } from '../components/ui'
import { HISTORY_ORDERS, type CollectionOrder, type OrderStatus } from '../data/mock'

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  checking: 'Checking',
  processing: 'Processing',
  success: 'Success',
  fail: 'Fail',
}

type SheetKind = 'account' | 'type' | 'filter' | null

export default function OrderList() {
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [account, setAccount] = useState<string>('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [detail, setDetail] = useState<CollectionOrder | null>(null)

  const accounts = useMemo(
    () => Array.from(new Set(HISTORY_ORDERS.map((o) => o.account))),
    [],
  )

  const filtered = HISTORY_ORDERS.filter(
    (o) => (!account || o.account === account) && (!status || o.status === status),
  )

  return (
    <Shell>
      <StatusBar />
      <TopBar title="Order List" />
      <div className="scroll pad">
        <div className="filter-row">
          <button className="filter-pill" onClick={() => setSheet('account')}>
            Account &#9662;
          </button>
          <button className="filter-pill" onClick={() => setSheet('type')}>
            Type &#9662;
          </button>
          <button className="filter-pill" onClick={() => setSheet('filter')}>
            Filter &#9662;
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
                <span>Account: {o.account}</span>
                <span>{o.time}</span>
              </div>
            </div>
          ))
        )}
        <div style={{ height: 24 }} />
      </div>

      {sheet === 'account' && (
        <Sheet title="Account" onClose={() => setSheet(null)}>
          <div className={'sheet-radio' + (account === '' ? ' active' : '')} onClick={() => { setAccount(''); setSheet(null) }}>
            <span className="sr-k">All accounts</span>
            <span className="sr-dot" />
          </div>
          {accounts.map((a) => (
            <div
              key={a}
              className={'sheet-radio' + (account === a ? ' active' : '')}
              onClick={() => {
                setAccount(a)
                setSheet(null)
              }}
            >
              <span className="sr-k">{a}</span>
              <span className="sr-dot" />
            </div>
          ))}
        </Sheet>
      )}

      {(sheet === 'type' || sheet === 'filter') && (
        <Sheet title="Type" onClose={() => setSheet(null)}>
          <div className="sheet-opts">
            {(['', 'success', 'fail', 'processing', 'checking'] as const).map((s) => (
              <button
                key={s || 'all'}
                className={'sheet-opt' + (status === s ? ' active' : '')}
                onClick={() => setStatus(s)}
              >
                {s === '' ? 'All' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <div className="time-row">
            <input placeholder="Start date" />
            <input placeholder="End date" />
          </div>
          <div className="sheet-foot">
            <button
              className="btn btn-outline"
              onClick={() => {
                setStatus('')
                setAccount('')
              }}
            >
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
              <span className="dr-k">Wallet Account</span>
              <span className="dr-v">{detail.account}</span>
            </div>
            <div className="detail-row">
              <span className="dr-k">Collection Account</span>
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
