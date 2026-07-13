import { useState } from 'react'
import { PageHead, Pill, Modal, money } from '../components/ui'
import { Icons } from '../components/icons'
import { useAdmin } from '../data/store'

const TONE: Record<string, string> = { pending: 'amber', approved: 'green', rejected: 'red' }

export default function Withdrawals() {
  const { withdrawals, agents, setTxnStatus, assignWithdrawal, settings, patchSettings } = useAdmin()
  const s = settings
  const [assignId, setAssignId] = useState<string | null>(null)
  const activeAgents = agents.filter((a) => a.active)

  return (
    <>
      <PageHead title="Withdrawals" subtitle="Review payout requests and set withdrawal limits & methods" />

      <div className="grid grid-2" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 24 }}>
        <div className="card card-pad">
          <h3 className="section-title">Withdrawal limits</h3>
          <p className="section-sub">Per-transaction minimum and maximum.</p>
          <div className="form-grid">
            <div className="fld">
              <label>Minimum</label>
              <div className="inp-group"><span className="addon">Rs </span><input type="number" value={s.minWithdraw} onChange={(e) => patchSettings({ minWithdraw: Number(e.target.value) })} /></div>
            </div>
            <div className="fld">
              <label>Maximum</label>
              <div className="inp-group"><span className="addon">Rs </span><input type="number" value={s.maxWithdraw} onChange={(e) => patchSettings({ maxWithdraw: Number(e.target.value) })} /></div>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="section-title">Withdrawal methods</h3>
          <p className="section-sub">Toggle which channels players can cash out through.</p>
          {([
            ['Jazzcash', 'methodJazzcash'],
            ['Easypaisa', 'methodEasypaisa'],
            ['Bank account', 'methodBank'],
          ] as const).map(([label, key]) => (
            <div className="field-row" key={key}>
              <div className="fr-info"><b>{label}</b></div>
              <div className="fr-control">
                <button className={'sw' + (s[key] ? ' on' : '')} onClick={() => patchSettings({ [key]: !s[key] } as any)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Payout requests</h3>
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
              {withdrawals.map((w) => (
                <tr key={w.id}>
                  <td className="cell-main">{w.id}</td>
                  <td>
                    <div className="cell-main">{w.user}</div>
                    <div className="cell-sub">{w.phone}</div>
                  </td>
                  <td><Pill tone="violet">{w.method}</Pill></td>
                  <td className="t-right num cell-main">{money(w.amount)}</td>
                  <td className="muted">{w.time}</td>
                  <td><Pill tone={TONE[w.status]}>{w.status}</Pill></td>
                  <td className="t-right">
                    {w.status === 'pending' ? (
                      <div className="flex gap8" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setAssignId(w.id)} title="Assign to an agent to pay on behalf">Assign agent</button>
                        <button className="btn btn-success btn-sm" onClick={() => setTxnStatus('withdrawals', w.id, 'approved')}>{Icons.check} Pay</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setTxnStatus('withdrawals', w.id, 'rejected')}>Reject</button>
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

      {assignId && (
        <Modal title="Assign to agent (pay on behalf)" onClose={() => setAssignId(null)}>
          <p className="section-sub">The agent pays the player from their own funds and is reimbursed + reward on submit.</p>
          {activeAgents.length === 0 && <div className="muted">No active agents available.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeAgents.map((a) => (
              <button
                key={a.id}
                className="btn btn-outline"
                style={{ justifyContent: 'space-between' }}
                onClick={() => { assignWithdrawal(assignId, a.id); setAssignId(null) }}
              >
                <span>{a.name}</span>
                <span className="muted">{a.phone}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  )
}
