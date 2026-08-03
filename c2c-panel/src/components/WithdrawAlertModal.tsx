import { useNavigate } from 'react-router-dom'
import { fmt } from './ui'
import type { MerchantWithdrawEvent } from '../api/realtime'

export default function WithdrawAlertModal({
  alert,
  onLater,
  onOpen,
}: {
  alert: MerchantWithdrawEvent
  onLater: () => void
  onOpen: () => void
}) {
  const nav = useNavigate()

  function openWithdraw() {
    onOpen()
    nav('/pay-on-behalf')
  }

  return (
    <div className="alert-overlay" role="alertdialog" aria-modal="true" aria-labelledby="wd-alert-title">
      <div className="alert-modal">
        <div className="alert-banner urgent">NEW WITHDRAW REQUEST</div>
        <div className="alert-body">
          <div id="wd-alert-title" className="alert-title">
            {alert.title}
          </div>
          <p className="alert-text">{alert.body}</p>
          <div className="alert-meta">
            <div>
              <span>Amount</span>
              <b>Rs {fmt(alert.amount)}</b>
            </div>
            <div>
              <span>Method</span>
              <b>{alert.method}</b>
            </div>
            {alert.playerName && (
              <div>
                <span>Player</span>
                <b>{alert.playerName}</b>
              </div>
            )}
          </div>
        </div>
        <div className="alert-actions">
          <button type="button" className="btn btn-outline btn-block" onClick={onLater}>
            Later
          </button>
          <button type="button" className="btn btn-gold btn-block" onClick={openWithdraw}>
            Open Pay On Behalf
          </button>
        </div>
      </div>
    </div>
  )
}
