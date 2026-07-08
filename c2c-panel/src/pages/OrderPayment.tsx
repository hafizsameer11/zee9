import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Shell, StatusBar, TopBar, fmt } from '../components/ui'
import { useStore } from '../data/store'

const STEPS = [
  { label: 'Already ordered', time: '06-27 09:32' },
  { label: 'Already paid', time: '06-27 09:34' },
  { label: 'On Hold', time: '06-27 09:50' },
  { label: 'success', time: '06-27 09:35' },
]

export default function OrderPayment() {
  const { id } = useParams()
  const nav = useNavigate()
  const { orders, resolveOrder, showToast } = useStore()
  const order = orders.find((o) => o.id === id)
  const [trx, setTrx] = useState('')

  if (!order) {
    return (
      <Shell>
        <StatusBar />
        <TopBar title="Payment" />
        <div className="scroll pad">
          <div className="card empty">
            <div className="e-ico">&#9989;</div>
            Order already handled
          </div>
        </div>
      </Shell>
    )
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    showToast('Copied')
  }

  function confirmPaid() {
    if (!trx.trim()) {
      showToast('Please enter TRX ID')
      return
    }
    resolveOrder(order!.id, 'success')
    nav('/collections')
  }

  return (
    <Shell>
      <StatusBar />
      <TopBar title="Payment" />
      <div className="scroll pad">
        <div className="stepper">
          {STEPS.map((s, i) => (
            <div className="step" key={s.label}>
              <div className={'bar' + (i >= 2 ? ' pending' : '')} />
              <div className={'dot' + (i >= 3 ? ' pending' : '')} />
              <div className="st-label">{s.label}</div>
              <div className="st-time">{s.time}</div>
            </div>
          ))}
        </div>

        <div className="card pay-amount-card">
          <div className="cap">AMOUNT OF PAYMENT</div>
          <div className="amt">
            {fmt(order.amount)}
            <span className="copy-ic" onClick={() => copy(String(order.amount))}>
              &#128203;
            </span>
          </div>
          <div className="warn">The payment amount must be consistent with the order amount.</div>
        </div>

        <div className="pay-block-label">COLLECTION ACCOUNT</div>
        <div className="card copy-card">
          <div className="cc-sub">{order.method} Account</div>
          <div className="copy-line">
            <div className="cc-field">{order.collectionAccount}</div>
            <button className="cc-copy" onClick={() => copy(order.collectionAccount)}>
              Copy
            </button>
          </div>
        </div>

        <div className="pay-block-label">TRX ID.</div>
        <div className="card copy-card">
          <div className="copy-line">
            <input
              className="cc-field"
              style={{ color: '#4b49c4', textAlign: 'center' }}
              value={trx}
              onChange={(e) => setTrx(e.target.value)}
              placeholder="Enter TRX ID"
            />
            <button className="cc-copy" onClick={() => copy(trx)}>
              Copy
            </button>
          </div>
        </div>

        <div className="pay-block-label">IMPORTANT TIPS</div>
        <div className="card copy-card">
          <div style={{ color: '#b9b9c8', fontSize: 14, lineHeight: 1.8 }}>
            1. Please handle it as soon as possible within the specified time.
            <br />
            2. Please check your order information carefully, after confirmation, your deposit will
            be deducted;
            <br />
            3. Please check and review the order truthfully.
            <br />
            4. If you have any questions, please contact customer service;
            <br />
            5. If the order is found to be maliciously delayed, it will be sealed or fined. Please
            handle the unprocessed order as soon as possible.
          </div>
        </div>

        <div style={{ height: 16 }} />
        <button className="btn btn-gold btn-block" onClick={confirmPaid}>
          I have paid
        </button>
        <div style={{ height: 24 }} />
      </div>
    </Shell>
  )
}
