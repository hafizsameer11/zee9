import { useNavigate } from 'react-router-dom'
import { fmt } from './ui'
import type { MerchantDepositEvent } from '../api/realtime'

export default function DepositAlertModal({
  alert,
  onLater,
  onReject,
  onOpen,
}: {
  alert: MerchantDepositEvent
  onLater: () => void
  onReject?: () => void
  onOpen: () => void
}) {
  const nav = useNavigate()
  const submitted = alert.type === 'deposit_submitted'

  function openOrder() {
    onOpen()
    if (alert.orderId) nav('/order/' + alert.orderId)
    else nav('/collections')
  }

  return (
    <div className="alert-overlay" role="alertdialog" aria-modal="true" aria-labelledby="dep-alert-title">
      <div className="alert-modal">
        <div className={`alert-banner ${submitted ? 'urgent' : ''}`}>
          {submitted ? 'CHECKING — PLAYER SUBMITTED TRX' : 'NEW DEPOSIT ORDER'}
        </div>
        <div className="alert-body">
          <div id="dep-alert-title" className="alert-title">
            {submitted ? 'Checking required' : alert.title}
          </div>
          <p className="alert-text">
            {submitted
              ? 'Player ne TRX ID submit kar diya hai. Order confirm / not received check karein.'
              : alert.body}
          </p>
          <div className="alert-meta">
            <div>
              <span>Amount</span>
              <b>Rs {fmt(alert.amount)}</b>
            </div>
            <div>
              <span>Method</span>
              <b>{alert.method}</b>
            </div>
            {alert.collectionAccount && (
              <div>
                <span>Your number</span>
                <b>{alert.collectionAccount}</b>
              </div>
            )}
            {alert.trxId && (
              <div>
                <span>TRX ID</span>
                <b>{alert.trxId}</b>
              </div>
            )}
            {alert.orderNo && (
              <div>
                <span>Order</span>
                <b style={{ fontSize: 11, wordBreak: 'break-all' }}>{alert.orderNo}</b>
              </div>
            )}
          </div>
        </div>
        <div className="alert-actions">
          <button type="button" className="btn btn-outline btn-block" onClick={onLater}>
            Later
          </button>
          {submitted && onReject && (
            <button type="button" className="btn btn-outline btn-block" onClick={onReject}>
              Not received
            </button>
          )}
          <button type="button" className="btn btn-gold btn-block" onClick={openOrder}>
            {submitted ? 'Checking' : 'Open order'}
          </button>
        </div>
      </div>
    </div>
  )
}
