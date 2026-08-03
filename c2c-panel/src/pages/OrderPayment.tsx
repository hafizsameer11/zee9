import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Shell, StatusBar, TopBar, Modal, fmt } from '../components/ui'
import { useStore } from '../data/store'
import { confirmRemainSec, mmss, payRemainSec, shouldShowConfirmCountdown, shouldShowPayCountdown } from '../lib/confirmWindow'

export default function OrderPayment() {
  const { id } = useParams()
  const nav = useNavigate()
  const { orders, resolveOrder, acceptOrder, showToast, reload, markCheckingOrderOpened } = useStore()
  const order = orders.find((o) => o.id === id)
  const [remarks, setRemarks] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [confirm, setConfirm] = useState<null | 'success' | 'fail'>(null)
  const [busy, setBusy] = useState(false)
  const resolveLock = useRef(false)
  const [now, setNow] = useState(Date.now())

  const showConfirmTimer = order ? shouldShowConfirmCountdown(order.status, order.submittedAt) : false
  const showPayTimer = order
    ? shouldShowPayCountdown(order.status, order.submittedAt, order.trxId)
    : false
  const confirmLeft = showConfirmTimer && order ? confirmRemainSec(order.submittedAt, now) : 0
  const payLeft = showPayTimer && order ? payRemainSec(order.createdAt || order.time.replace(' ', 'T'), now) : 0

  useEffect(() => {
    if (!showConfirmTimer && !showPayTimer) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [showConfirmTimer, showPayTimer])

  useEffect(() => {
    if (!id || !order) return
    const hasTrx = !!(order.submittedAt || (order.trxId && order.trxId.trim()))
    if (hasTrx) markCheckingOrderOpened(id)
  }, [id, order?.submittedAt, order?.trxId, markCheckingOrderOpened])

  // When 5m pay window hits 0, refresh so expired order leaves the queue
  useEffect(() => {
    if (!showPayTimer || payLeft > 0) return
    reload()
  }, [showPayTimer, payLeft, reload])

  useEffect(() => {
    if (id && order?.status === 'pending' && !accepted) {
      acceptOrder(id)
        .then(() => setAccepted(true))
        .catch(() => {})
    }
  }, [id, order?.status, accepted, acceptOrder])

  if (!order) {
    return (
      <Shell>
        <StatusBar />
        <TopBar title="Order Details" onBack={() => nav('/collections')} />
        <div className="scroll pad">
          <div className="card empty">
            <div className="e-ico">&#9989;</div>
            Order already handled
            <div style={{ height: 16 }} />
            <button type="button" className="btn btn-gold btn-block" onClick={() => nav('/collections')}>
              Back to Collections
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  function copy(text: string) {
    if (!text) return
    navigator.clipboard?.writeText(text).catch(() => {})
    showToast('Copied')
  }

  async function doResolve() {
    if (!confirm || !order || resolveLock.current || busy) return
    resolveLock.current = true
    setBusy(true)
    try {
      await resolveOrder(order.id, confirm, order.trxId || undefined)
      setConfirm(null)
      nav('/collections')
    } catch {
      resolveLock.current = false
    } finally {
      setBusy(false)
    }
  }

  const done = order.status === 'success' || order.status === 'fail'

  return (
    <Shell>
      <StatusBar />
      <TopBar title="Order Details" onBack={() => nav('/collections')} face={false} />
      <div className="scroll maroon-body" style={{ background: '#fff', flex: 1 }}>
        <div className="mb-inner">
          {showConfirmTimer && (
            <div className="od-countdown-banner">
              <span>Confirm within</span>
              <strong className="ol-timer">{mmss(confirmLeft)}</strong>
              <span className="muted" style={{ fontSize: 11 }}>
                (1 hour after TRX submit)
              </span>
            </div>
          )}
          {showPayTimer && (
            <div className={`od-countdown-banner${payLeft <= 0 ? ' expired' : ''}`}>
              <span>Player TRX submit</span>
              <strong className="ol-timer">{payLeft <= 0 ? '00:00' : mmss(payLeft)}</strong>
              <span className="muted" style={{ fontSize: 11 }}>
                (expires in 5 minutes if no TRX)
              </span>
            </div>
          )}

          <div className="od-banner">
            <div className="od-row">
              <span className="od-k">Time Of Payment</span>
              <span className="od-v">{order.time}</span>
            </div>
            <div className="od-row">
              <span className="od-k">Amount</span>
              <span className="od-v strong">{fmt(order.amount)}</span>
            </div>
            <div className="od-row">
              <span className="od-k">Method</span>
              <span className="od-v">{order.method}</span>
            </div>
            <div className="od-row">
              <span className="od-k">Account</span>
              <span className="od-v">{order.collectionAccount || '—'}</span>
              {order.collectionAccount && (
                <button type="button" className="od-copy" onClick={() => copy(order.collectionAccount)}>
                  Copy
                </button>
              )}
            </div>
            {(order.collectionHolder || order.playerName) && (
              <div className="od-row">
                <span className="od-k">Name</span>
                <span className="od-v">{order.collectionHolder || order.playerName}</span>
                <button
                  type="button"
                  className="od-copy"
                  onClick={() => copy(order.collectionHolder || order.playerName || '')}
                >
                  Copy
                </button>
              </div>
            )}
            <div className="od-row">
              <span className="od-k">Reward</span>
              <span className="od-v gold">{fmt(order.reward)}</span>
            </div>
          </div>

          <div className="mb-step-title">REF NO.</div>
          <div className="copy-line" style={{ marginBottom: 12 }}>
            <input
              className="cc-field"
              style={{ color: '#4b49c4', textAlign: 'center' }}
              value={order.trxId || ''}
              readOnly
              placeholder="Waiting for player TRX ID"
            />
            <button
              type="button"
              className="cc-copy"
              onClick={() => copy(order.trxId || '')}
              disabled={!order.trxId}
            >
              Copy
            </button>
          </div>

          <div className="mb-step-title">PLATFORM REMARKS</div>
          <textarea
            className="mb-input"
            style={{ minHeight: 72, resize: 'vertical' }}
            placeholder="Please enter the information"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={done}
          />

          <div className="mb-step-title">IMPORTANT TIPS</div>
          <div className="od-tips">
            1. Please handle it as soon as possible within the specified time.
            <br />
            2. Please check your order carefully. After confirmation, Rs {fmt(order.amount)} is cut from your
            balance and Rs {fmt(order.reward)} reward is added.
            <br />
            3. Confirm only after you have received the exact amount on your collection number.
            <br />
            4. If you have any questions, please contact customer service.
            <br />
            5. Malicious delay or false confirmation may result in account penalties.
          </div>

          {done ? (
            <>
              <div style={{ height: 16 }} />
              {order.manualDone ? (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <div className="detail-status fail">Fail</div>
                  <div className="detail-status manual-done">Manual Done</div>
                </div>
              ) : (
                <div className={'detail-status ' + order.status} style={{ display: 'block', textAlign: 'center' }}>
                  {order.status === 'success' ? 'Marked received' : 'Marked not received'}
                </div>
              )}
              <button type="button" className="btn btn-gold btn-block" onClick={() => nav('/collections')}>
                Back to Collections
              </button>
            </>
          ) : (
            <div className="od-actions">
              <button type="button" className="od-btn od-btn-muted" onClick={() => setConfirm('fail')}>
                Not received
              </button>
              <button type="button" className="od-btn od-btn-gold" onClick={() => setConfirm('success')}>
                Receive a transfer
                {showConfirmTimer && confirmLeft > 0 ? ` ${mmss(confirmLeft)}` : ''}
              </button>
            </div>
          )}
          <div style={{ height: 24 }} />
        </div>
      </div>

      {confirm && (
        <Modal
          title={confirm === 'success' ? 'Confirm received?' : 'Confirm not received?'}
          body={
            confirm === 'success' ? (
              <>
                Confirm only after you received Rs {fmt(order.amount)} on{' '}
                {order.collectionAccount || 'the collection number'}. Your panel balance will be:{' '}
                −{fmt(order.amount)} deposit + {fmt(order.reward)} reward.
              </>
            ) : (
              <>
                Mark this deposit as not received? The player order will fail and this queue item will close.
              </>
            )
          }
          cancelText="Cancel"
          okText="Confirm"
          onCancel={() => !busy && setConfirm(null)}
          onOk={() => {
            if (!busy) doResolve()
          }}
        />
      )}
    </Shell>
  )
}
