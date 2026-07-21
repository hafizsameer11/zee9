import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, TopBar } from '../components/ui'
import { useStore } from '../data/store'
import type { BankAccount } from '../data/mock'

const METHODS: { label: string; value: BankAccount['method'] }[] = [
  { label: 'Easypaisa', value: 'Easypaisa' },
  { label: 'Jazzcash', value: 'Jazzcash' },
]

export default function AddAccount() {
  const nav = useNavigate()
  const { addAccount, showToast, accounts } = useStore()
  const [step, setStep] = useState<1 | 2>(1)
  const [method, setMethod] = useState<BankAccount['method']>('Easypaisa')
  const [holder, setHolder] = useState('')
  const [number, setNumber] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)

  const used = accounts.filter((a) => a.method === method).length

  function next() {
    if (!holder.trim() || number.trim().length < 3) {
      showToast('Please fill holder name and number')
      return
    }
    if (used >= 30) {
      showToast(`Maximum 30 ${method} accounts`)
      return
    }
    setStep(2)
  }

  async function bind() {
    if (!pw) {
      showToast('Please input your login password')
      return
    }
    setBusy(true)
    try {
      await addAccount({ method, holder: holder.trim(), number: number.trim(), on: false, awaiting: false })
      showToast('Account added — turn Active to show it to players')
      nav('/accounts')
    } catch (e: any) {
      showToast(e?.message || 'Failed to add')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <StatusBar />
      <TopBar title="Add account" />
      <div className="scroll">
        {step === 1 ? (
          <>
            <div className="card form-card">
              <div className="pay-block-label" style={{ color: '#222', marginTop: 0 }}>
                Payment Method ({used}/30)
              </div>
              <div className="seg">
                {METHODS.map((m) => (
                  <button
                    key={m.label}
                    className={'seg-btn' + (method === m.value ? ' active' : '')}
                    onClick={() => setMethod(m.value)}
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
                <label>{method} number</label>
                <input
                  value={number}
                  inputMode="numeric"
                  placeholder="03XXXXXXXXX"
                  onChange={(e) => setNumber(e.target.value)}
                />
              </div>

              <div className="tips">
                You can add up to 30 JazzCash and 30 Easypaisa numbers. Only one of each method can be Active at a time — that Active number is what players see for deposits.
              </div>
            </div>
            <div className="form-foot">
              <button className="btn btn-outline" onClick={() => nav(-1)}>
                Cancel
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
                After binding, open Account Management and set this number to Active if you want players to deposit to it.
              </div>
            </div>
            <div className="form-foot">
              <button className="btn btn-outline" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="btn btn-violet" disabled={busy} onClick={bind}>
                {busy ? '…' : 'Bind'}
              </button>
            </div>
          </>
        )}
      </div>
    </Shell>
  )
}
