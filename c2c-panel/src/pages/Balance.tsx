import { Shell, StatusBar, TopBar, fmt } from '../components/ui'
import { useStore } from '../data/store'
import { DEPOSIT_HISTORY } from '../data/mock'

export default function Balance() {
  const { balance, freeze, showToast } = useStore()
  return (
    <Shell>
      <StatusBar />
      <TopBar title="Balance" />
      <div className="scroll pad">
        <div className="card deposit-balance">
          <div className="db-num">{fmt(balance)}</div>
          <div className="db-freeze">Freeze: {fmt(freeze)}</div>
        </div>
        <div style={{ height: 20 }} />
        <button className="btn btn-violet btn-block" onClick={() => showToast('Deposit request sent')}>
          Deposit
        </button>

        <div className="section-label" style={{ marginTop: 24 }}>
          ACCOUNT DETAILS
        </div>
        <div className="card table">
          <div className="thead">
            <div>Transaction Type</div>
            <div className="c-amt">Amount</div>
            <div className="c-time">Time</div>
          </div>
          {DEPOSIT_HISTORY.map((t) => (
            <div className="trow" key={t.id}>
              <div>{t.type}</div>
              <div className="c-amt">{fmt(t.amount)}</div>
              <div className="c-time">{t.time}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 24 }} />
      </div>
    </Shell>
  )
}
