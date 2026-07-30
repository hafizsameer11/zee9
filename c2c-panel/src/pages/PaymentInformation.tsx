import { useMemo, useState } from 'react'
import { Shell, StatusBar, TopBar, Sheet, fmt } from '../components/ui'
import { useStore } from '../data/store'

export default function PaymentInformation() {
  const { transactions } = useStore()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<string>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [draftType, setDraftType] = useState('')
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')

  const txnTypes = useMemo(() => Array.from(new Set(transactions.map((t) => t.type))), [transactions])
  const rows = transactions.filter((t) => {
    if (type && t.type !== type) return false
    const day = t.time.slice(0, 10)
    if (from && day < from) return false
    if (to && day > to) return false
    return true
  })

  function openFilter() {
    setDraftType(type)
    setDraftFrom(from)
    setDraftTo(to)
    setOpen(true)
  }

  function apply() {
    setType(draftType)
    setFrom(draftFrom)
    setTo(draftTo)
    setOpen(false)
  }

  function reset() {
    setDraftType('')
    setDraftFrom('')
    setDraftTo('')
    setType('')
    setFrom('')
    setTo('')
  }

  return (
    <Shell>
      <StatusBar />
      <TopBar
        title="Payment Information"
        right={
          <button className="tb-btn" onClick={openFilter} aria-label="Filter">
            &#9776;
          </button>
        }
      />
      <div className="scroll pad">
        {(type || from || to) && (
          <div className="filter-row" style={{ marginBottom: 10 }}>
            {type && <span className="filter-pill active">{type}</span>}
            {(from || to) && (
              <span className="filter-pill active">
                {from || '…'} → {to || '…'}
              </span>
            )}
            <button className="filter-pill" onClick={reset}>Clear</button>
          </div>
        )}
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
              className={'sheet-opt' + (draftType === '' ? ' active' : '')}
              onClick={() => setDraftType('')}
            >
              All
            </button>
            {txnTypes.map((t) => (
              <button
                key={t}
                className={'sheet-opt' + (draftType === t ? ' active' : '')}
                onClick={() => setDraftType(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="pay-block-label" style={{ color: '#222', marginTop: 16 }}>
            Customize Time
          </div>
          <div className="time-row">
            <input type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} />
            <input type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} />
          </div>
          <div className="sheet-foot">
            <button className="btn btn-outline" onClick={reset}>
              Reset
            </button>
            <button className="btn btn-violet" onClick={apply}>
              Confirm
            </button>
          </div>
        </Sheet>
      )}
    </Shell>
  )
}
