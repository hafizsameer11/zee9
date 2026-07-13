import { useMemo, useState } from 'react'
import { Shell, StatusBar, TopBar, Sheet, fmt } from '../components/ui'
import { useStore } from '../data/store'

export default function PaymentInformation() {
  const { transactions } = useStore()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<string>('')

  const txnTypes = useMemo(() => Array.from(new Set(transactions.map((t) => t.type))), [transactions])
  const rows = transactions.filter((t) => !type || t.type === type)

  return (
    <Shell>
      <StatusBar />
      <TopBar
        title="Payment Information"
        right={
          <button className="tb-btn" onClick={() => setOpen(true)} aria-label="Filter">
            &#9776;
          </button>
        }
      />
      <div className="scroll pad">
        <div className="card table">
          <div className="thead">
            <div>Transaction Type</div>
            <div className="c-amt">Amount</div>
            <div className="c-time">Time</div>
          </div>
          {rows.map((t) => (
            <div className="trow" key={t.id}>
              <div>{t.type}</div>
              <div className="c-amt">{fmt(t.amount)}</div>
              <div className="c-time">{t.time}</div>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="empty">
              <div className="e-ico">&#128203;</div>
              No records
            </div>
          )}
        </div>
        <div style={{ height: 24 }} />
      </div>

      {open && (
        <Sheet title="Type" onClose={() => setOpen(false)}>
          <div className="sheet-opts">
            <button
              className={'sheet-opt' + (type === '' ? ' active' : '')}
              onClick={() => setType('')}
            >
              All
            </button>
            {txnTypes.map((t) => (
              <button
                key={t}
                className={'sheet-opt' + (type === t ? ' active' : '')}
                onClick={() => setType(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="pay-block-label" style={{ color: '#222', marginTop: 16 }}>
            Customize Time
          </div>
          <div className="time-row">
            <input placeholder="Start date" />
            <input placeholder="End date" />
          </div>
          <div className="sheet-foot">
            <button className="btn btn-outline" onClick={() => setType('')}>
              Reset
            </button>
            <button className="btn btn-violet" onClick={() => setOpen(false)}>
              Confirm
            </button>
          </div>
        </Sheet>
      )}
    </Shell>
  )
}
