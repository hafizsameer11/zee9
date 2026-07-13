import { PageHead, Pill, money } from '../components/ui'
import { Icons } from '../components/icons'
import { useAdmin } from '../data/store'

const TONE: Record<string, string> = { pending: 'amber', approved: 'green', rejected: 'red' }

export default function Deposits() {
  const { deposits, setTxnStatus, settings, patchSettings } = useAdmin()
  const s = settings

  return (
    <>
      <PageHead title="Deposits" subtitle="Confirm incoming deposits and set deposit limits" />

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <h3 className="section-title">Deposit limits</h3>
        <p className="section-sub">Per-transaction minimum and maximum deposit.</p>
        <div className="form-grid">
          <div className="fld">
            <label>Minimum deposit</label>
            <div className="inp-group"><span className="addon">Rs </span><input type="number" value={s.minDeposit} onChange={(e) => patchSettings({ minDeposit: Number(e.target.value) })} /></div>
          </div>
          <div className="fld">
            <label>Maximum deposit</label>
            <div className="inp-group"><span className="addon">Rs </span><input type="number" value={s.maxDeposit} onChange={(e) => patchSettings({ maxDeposit: Number(e.target.value) })} /></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Deposit requests</h3>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Player</th>
                <th>Method</th>
                <th className="t-right">Amount</th>
                <th>Time</th>
                <th>Status</th>
                <th className="t-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((d) => (
                <tr key={d.id}>
                  <td className="cell-main">{d.id}</td>
                  <td>
                    <div className="cell-main">{d.user}</div>
                    <div className="cell-sub">{d.phone}</div>
                  </td>
                  <td><Pill tone="blue">{d.method}</Pill></td>
                  <td className="t-right num cell-main">{money(d.amount)}</td>
                  <td className="muted">{d.time}</td>
                  <td><Pill tone={TONE[d.status]}>{d.status}</Pill></td>
                  <td className="t-right">
                    {d.status === 'pending' ? (
                      <div className="flex gap8" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-success btn-sm" onClick={() => setTxnStatus('deposits', d.id, 'approved')}>{Icons.check} Confirm</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setTxnStatus('deposits', d.id, 'rejected')}>Reject</button>
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
