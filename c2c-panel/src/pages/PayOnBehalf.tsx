import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar } from '../components/ui'
import { useStore } from '../data/store'
import { PAYOUT_BANK } from '../data/mock'

function mmss(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function PayOnBehalf() {
  const nav = useNavigate()
  const { showToast } = useStore()
  const [left, setLeft] = useState(9 * 60 + 55)
  const [trx, setTrx] = useState('')
  const [acct, setAcct] = useState('')

  useEffect(() => {
    const t = window.setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000)
    return () => window.clearInterval(t)
  }, [])

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    showToast('Copied')
  }

  function submit() {
    if (!trx.trim()) {
      showToast('Please enter Transfer ID')
      return
    }
    showToast('Submitted for review')
    nav('/')
  }

  const info: [string, string][] = [
    ['Amount:', PAYOUT_BANK.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })],
    ['Bank Name:', PAYOUT_BANK.bankName],
    ['Account No.:', PAYOUT_BANK.accountNo],
    ['Account Title:', PAYOUT_BANK.accountTitle],
  ]

  return (
    <Shell className="maroon-shell">
      <StatusBar dark />
      <div className="pay-header">
        <button
          className="tb-btn"
          style={{ position: 'absolute', left: 14 }}
          onClick={() => nav('/')}
          aria-label="Back"
        >
          &#8249;
        </button>
        Payment
        <span className="timer">{mmss(left)}</span>
      </div>

      <div className="scroll maroon-body">
        <div className="mb-inner">
          <div className="mb-step-title">Step 1. Copy bank information</div>
          {info.map(([k, v]) => (
            <div className="info-line" key={k}>
              <span className="il-k">{k}</span>
              <span className="il-v" style={k === 'Bank Name:' || k === 'Account Title:' ? { color: '#7c1620' } : undefined}>
                {v}
              </span>
              <button className="il-copy" onClick={() => copy(v)}>
                copy
              </button>
            </div>
          ))}
          <div className="mb-warn">
            &#9888; Each recharge must get new online account, otherwise money cant reach
          </div>

          <div className="mb-step-title">
            Step 2. Open your Bank App or Web transfer to our receiveing bank account
          </div>

          <div className="mb-step-title">
            Step 3. After finish the transfer, back this page to fill Transfer ID
          </div>
          <input
            className="mb-input"
            placeholder="Transfer ID"
            value={trx}
            onChange={(e) => setTrx(e.target.value)}
          />

          <div className="mb-label">Your Bank Account Number just used</div>
          <input
            className="mb-input"
            placeholder="Your Account Number"
            value={acct}
            onChange={(e) => setAcct(e.target.value)}
          />

          <button className="mb-submit" onClick={submit}>
            Submit
          </button>
        </div>
      </div>
    </Shell>
  )
}
