import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, TopBar } from '../components/ui'
import { useStore } from '../data/store'
import type { BankAccount } from '../data/mock'

const METHODS: { label: string; value: BankAccount['method']; disabled?: boolean }[] = [
  { label: 'Easypaisa', value: 'Easypaisa' },
  { label: 'Jazzcash', value: 'Jazzcash' },
  { label: 'Easypaisa (Retailer)', value: 'Easypaisa', disabled: true },
  { label: 'Jazzcash (Retailer)', value: 'Jazzcash', disabled: true },
  { label: 'Pakistan Bank', value: 'Bank', disabled: true },
]

export default function AddAccount() {
  const nav = useNavigate()
  const { addAccount, showToast } = useStore()
  const [step, setStep] = useState<1 | 2>(1)
  const [method, setMethod] = useState<BankAccount['method']>('Easypaisa')
  const [holder, setHolder] = useState('')
  const [number, setNumber] = useState('')
  const [pw, setPw] = useState('')

  function next() {
    if (!holder || !number) {
      showToast('Please fill all fields')
      return
    }
    setStep(2)
  }

  function bind() {
    if (!pw) {
      showToast('Please input your login password')
      return
    }
    addAccount({ method, holder, number, on: false, awaiting: true })
    showToast('Binding UPI Succeed')
    nav('/accounts')
  }

  return (
    <Shell>
      <StatusBar />
      <TopBar title="Account Management" />
      <div className="scroll">
        {step === 1 ? (
          <>
            <div className="card form-card">
              <div className="pay-block-label" style={{ color: '#222', marginTop: 0 }}>
                Payment Method
              </div>
              <div className="seg">
                {METHODS.map((m) => (
                  <button
                    key={m.label}
                    className={
                      'seg-btn' +
                      (m.disabled ? ' disabled' : '') +
                      (!m.disabled && method === m.value ? ' active' : '')
                    }
                    onClick={() => !m.disabled && setMethod(m.value)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="field" style={{ marginTop: 18 }}>
                <label>Account Holder Name</label>
                <input value={holder} onChange={(e) => setHolder(e.target.value)} />
              </div>
              <div className="field">
                <label>{method}</label>
                <input
                  value={number}
                  inputMode="numeric"
                  placeholder="Account number"
                  onChange={(e) => setNumber(e.target.value)}
                />
              </div>

              <div className="tips">
                1. Please handle it as soon as possible within the specified time.
                <br />
                2. Please check your order information carefully, after confirmation, your deposit
                will be deducted;
                <br />
                3. Please check and review the order truthfully.
                <br />
                4. If you have any questions, please contact customer service.
              </div>
            </div>
            <div className="form-foot">
              <button className="btn btn-outline" onClick={() => nav(-1)}>
                Last step
              </button>
              <button className="btn btn-violet" onClick={next}>
                Next
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="card form-card">
              <div className="field">
                <label>Confirm With Login Password</label>
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Please input your login password"
                />
              </div>
              <div className="tips">
                1. Please handle it as soon as possible within the specified time.
                <br />
                2. Please check your order information carefully, after confirmation, your deposit
                will be deducted;
                <br />
                3. Please check and review the order truthfully.
                <br />
                4. If you have any questions, please contact customer service.
              </div>
            </div>
            <div className="form-foot">
              <button className="btn btn-outline" onClick={() => setStep(1)}>
                Last step
              </button>
              <button className="btn btn-violet" onClick={bind}>
                Binding
              </button>
            </div>
          </>
        )}
      </div>
    </Shell>
  )
}
