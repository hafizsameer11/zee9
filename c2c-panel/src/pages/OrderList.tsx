import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, TopBar, Sheet, fmt } from '../components/ui'
import { useStore } from '../data/store'
import type { CollectionOrder, OrderStatus } from '../data/mock'
import {
  confirmRemainSec,
  isOpenOrderStatus,
  mmss,
  payRemainSec,
  shouldShowConfirmCountdown,
  shouldShowPayCountdown,
} from '../lib/confirmWindow'

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  checking: 'Checking',
  processing: 'Processing...',
  success: 'Success',
  fail: 'Fail',
}

type SheetKind = 'account' | 'type' | 'filter' | null

export default function OrderList() {
  const nav = useNavigate()
  const { orders, accounts } = useStore()
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [account, setAccount] = useState('')
  const [type, setType] = useState<'' | 'DEPOSIT' | 'WITHDRAW'>('DEPOSIT')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [method, setMethod] = useState<'' | 'Jazzcash' | 'Easypaisa'>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [draftStatus, setDraftStatus] = useState<OrderStatus | ''>('')
  const [draftMethod, setDraftMethod] = useState<'' | 'Jazzcash' | 'Easypaisa'>('')
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')
  const [detail, setDetail] = useState<CollectionOrder | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const numbers = useMemo(() => {
    const fromAccounts = accounts.map((a) => a.number)
    const fromOrders = orders.map((o) => o.collectionAccount).filter(Boolean)
    return Array.from(new Set([...fromAccounts, ...fromOrders]))
  }, [accounts, orders])

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        if (account && o.collectionAccount !== account) return false
        if (type && o.type !== type) return false
        if (status && o.status !== status) return false
        if (method && o.method !== method) return false
        if (from) {
          const d = o.time.slice(0, 10)
          if (d < from) return false
        }
        if (to) {
          const d = o.time.slice(0, 10)
          if (d > to) return false
        }
        return true
      }),
    [orders, account, type, status, method, from, to],
  )

  const filterCount = [status, method, from, to].filter(Boolean).length

  function openFilter() {
    setDraftStatus(status)
    setDraftMethod(method)
    setDraftFrom(from)
    setDraftTo(to)
    setSheet('filter')
  }

  function applyFilter() {
    setStatus(draftStatus)
    setMethod(draftMethod)
    setFrom(draftFrom)
    setTo(draftTo)
    setSheet(null)
  }

  function resetFilter() {
    setDraftStatus('')
    setDraftMethod('')
    setDraftFrom('')
    setDraftTo('')
  }

  function openOrder(o: CollectionOrder) {
    if (isOpenOrderStatus(o.status) && o.type === 'DEPOSIT') {
      nav('/order/' + o.id)
      return
    }
    setDetail(o)
  }

  return (
    <Shell>
      <StatusBar />
      <TopBar title="Order List" onBack={() => nav('/collections')} />
      <div className="scroll pad">
        <div className="filter-row">
          <button type="button" className="filter-pill filter-pill-solid" onClick={() => setSheet('account')}>
            {account || 'Account'} &#9662;
          </button>
          <button type="button" className="filter-pill filter-pill-solid" onClick={() => setSheet('type')}>
            {type === 'DEPOSIT' ? 'Deposit' : type === 'WITHDRAW' ? 'Withdraw' : 'Type'} &#9662;
          </button>
          <button type="button" className="filter-pill filter-pill-solid" onClick={openFilter}>
            Filter{filterCount > 0 ? ` (${filterCount})` : ''} &#9662;
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="card empty">
            <div className="e-ico">&#128203;</div>
            No orders
          </div>
        ) : (
          filtered.map((o) => {
            const showConfirm = shouldShowConfirmCountdown(o.status, o.submittedAt)
            const showPay = shouldShowPayCountdown(o.status, o.submittedAt, o.trxId)
            const confirmLeft = showConfirm ? confirmRemainSec(o.submittedAt, now) : 0
            const payLeft = showPay ? payRemainSec(o.createdAt || o.time.replace(' ', 'T'), now) : 0
            return (
              <div className="order-card ol-ticket" key={o.id}>
                <div className="oc-top">
                  <div className="ol-head">
                    <div className="order-no">{o.orderNo}</div>
                    {showPay ? (
                      <span className="ol-timer" title="5 minutes for player TRX submit">
                        TRX {mmss(payLeft)}
                      </span>
                    ) : showConfirm ? (
                      <span className="ol-timer" title="1 hour after player TRX submit">
                        Countdown {mmss(confirmLeft)}
                      </span>
                    ) : null}
                  </div>
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
                      <button
                        type="button"
                        className={
                          o.status === 'checking' || o.status === 'processing'
                            ? 'btn btn-violet btn-sm'
                            : 'btn btn-outline btn-sm'
                        }
                        onClick={() => openOrder(o)}
                      >
                        {o.status === 'checking' || o.status === 'processing' ? 'Checking' : 'details'}
                      </button>
                      {o.manualDone ? (
                        <>
                          <span className="status fail">Fail</span>
                          <span className="status manual-done-tag">Manual Done</span>
                        </>
                      ) : (
                        <span className={'status ' + o.status}>{STATUS_LABEL[o.status]}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="oc-foot">
                  <span>Account: {o.collectionAccount || '—'}</span>
                  <span>{o.time}</span>
                </div>
              </div>
            )
          })
        )}
        <div style={{ height: 24 }} />
      </div>

      {sheet === 'account' && (
        <Sheet title="Account" onClose={() => setSheet(null)}>
          <div
            className={'sheet-radio' + (account === '' ? ' active' : '')}
            onClick={() => {
              setAccount('')
              setSheet(null)
            }}
          >
            <span className="sr-k">All accounts</span>
            <span className="sr-dot" />
          </div>
          {numbers.map((n) => (
            <div
              key={n}
              className={'sheet-radio' + (account === n ? ' active' : '')}
              onClick={() => {
                setAccount(n)
                setSheet(null)
              }}
            >
              <span className="sr-k">{n}</span>
              <span className="sr-dot" />
            </div>
          ))}
          {numbers.length === 0 && (
            <div className="muted" style={{ padding: '12px 4px', fontSize: 13 }}>
              No collection numbers yet
            </div>
          )}
        </Sheet>
      )}

      {sheet === 'type' && (
        <Sheet title="Type" onClose={() => setSheet(null)}>
          {(
            [
              { v: '' as const, label: 'All types' },
              { v: 'DEPOSIT' as const, label: 'Deposit' },
              { v: 'WITHDRAW' as const, label: 'Withdraw' },
            ] as const
          ).map((opt) => (
            <div
              key={opt.label}
              className={'sheet-radio' + (type === opt.v ? ' active' : '')}
              onClick={() => {
                setType(opt.v)
                setSheet(null)
              }}
            >
              <span className="sr-k">{opt.label}</span>
              <span className="sr-dot" />
            </div>
          ))}
        </Sheet>
      )}

      {sheet === 'filter' && (
        <Sheet title="Filter" onClose={() => setSheet(null)}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Status
          </div>
          <div className="sheet-opts">
            {(['', 'pending', 'checking', 'processing', 'success', 'fail'] as const).map((s) => (
              <button
                key={s || 'all'}
                type="button"
                className={'sheet-opt' + (draftStatus === s ? ' active' : '')}
                onClick={() => setDraftStatus(s)}
              >
                {s === '' ? 'All' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          <div className="muted" style={{ fontSize: 12, margin: '14px 0 8px' }}>
            Method
          </div>
          <div className="sheet-opts">
            {(['', 'Jazzcash', 'Easypaisa'] as const).map((m) => (
              <button
                key={m || 'all'}
                type="button"
                className={'sheet-opt' + (draftMethod === m ? ' active' : '')}
                onClick={() => setDraftMethod(m)}
              >
                {m || 'All methods'}
              </button>
            ))}
          </div>

          <div className="muted" style={{ fontSize: 12, margin: '14px 0 8px' }}>
            Date range
          </div>
          <div className="time-row">
            <input type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} />
            <input type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} />
          </div>
          <div className="sheet-foot">
            <button type="button" className="btn btn-outline" onClick={resetFilter}>
              Reset
            </button>
            <button type="button" className="btn btn-violet" onClick={applyFilter}>
              Confirm
            </button>
          </div>
        </Sheet>
      )}

      {detail && (
        <Sheet title="Order Details" onClose={() => setDetail(null)}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            {detail.manualDone ? (
              <>
                <div className="detail-status fail">Fail</div>
                <div className="detail-status manual-done">Manual Done</div>
              </>
            ) : (
              <div className={'detail-status ' + detail.status}>{STATUS_LABEL[detail.status]}</div>
            )}
          </div>
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
              <span className="dr-v">{detail.account || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="dr-k">Account</span>
              <span className="dr-v">{detail.collectionAccount || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="dr-k">Time</span>
              <span className="dr-v">{detail.time}</span>
            </div>
            {detail.trxId && (
              <div className="detail-row">
                <span className="dr-k">TID</span>
                <span className="dr-v">{detail.trxId}</span>
              </div>
            )}
          </div>
          <button type="button" className="btn btn-violet btn-block" onClick={() => setDetail(null)}>
            Close
          </button>
        </Sheet>
      )}
    </Shell>
  )
}
