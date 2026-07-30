import { useMemo, useState } from 'react'
import { PageHead, Pill, Modal, money } from '../components/ui'
import { Icons } from '../components/icons'
import { useAdmin } from '../data/store'
import type { Txn } from '../data/mock'

const TONE: Record<string, string> = { pending: 'amber', approved: 'green', rejected: 'red' }

function WithdrawRow({
  w,
  selected,
  onToggle,
  onAssign,
  onPay,
  onReject,
  onSendOne,
}: {
  w: Txn
  selected?: boolean
  onToggle?: () => void
  onAssign: () => void
  onPay: () => void
  onReject: () => void
  onSendOne?: () => void
}) {
  return (
    <tr>
      {onToggle && (
        <td>
          <input type="checkbox" checked={!!selected} onChange={onToggle} aria-label="Select" />
        </td>
      )}
      <td>
        <div className="cell-main" style={{ fontWeight: 800 }}>
          {w.panelId != null ? `Panel ID # ${w.panelId}` : '—'}
        </div>
        {w.panelName && <div className="cell-sub">{w.panelName}</div>}
      </td>
      <td>
        <div className="cell-main" style={{ fontWeight: 800 }}>
          {w.playerNo != null ? `Game ID ${w.playerNo}` : w.user}
        </div>
        <div className="cell-sub">
          {w.user}
          {w.phone ? ` · ${w.phone}` : ''}
        </div>
      </td>
      <td className="num" style={{ fontWeight: 700, fontFamily: 'monospace' }}>
        {w.orderNo || '—'}
      </td>
      <td>
        <Pill tone="violet">{w.method}</Pill>
      </td>
      <td className="t-right num cell-main">{money(w.amount)}</td>
      <td className="muted">{w.time}</td>
      <td>
        <Pill tone={TONE[w.status]}>{w.status}</Pill>
        {w.status === 'pending' && (
          <div className="cell-sub" style={{ marginTop: 4 }}>
            {w.c2cReleased ? 'In C2C pool' : 'Admin hold'}
          </div>
        )}
      </td>
      <td className="t-right">
        {w.status === 'pending' ? (
          <div className="flex gap8" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {!w.c2cReleased && onSendOne && (
              <button className="btn btn-outline btn-sm" onClick={onSendOne} title="Send this one to C2C">
                To C2C
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onAssign} title="Assign to a specific merchant">
              Assign agent
            </button>
            <button className="btn btn-success btn-sm" onClick={onPay}>
              {Icons.check} Pay
            </button>
            <button className="btn btn-danger btn-sm" onClick={onReject}>
              Reject
            </button>
          </div>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
    </tr>
  )
}

export default function Withdrawals() {
  const {
    withdrawals,
    agents,
    setTxnStatus,
    assignWithdrawal,
    releaseWithdrawalsToC2c,
    recallWithdrawalsFromC2c,
    releaseWithdrawalIdsToC2c,
    settings,
    patchSettings,
  } = useAdmin()
  const s = settings
  const [assignId, setAssignId] = useState<string | null>(null)
  const [sendCount, setSendCount] = useState(100)
  const [recallCount, setRecallCount] = useState(10)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [q, setQ] = useState('')
  const activeAgents = agents.filter((a) => a.active)

  const matchTxn = (w: Txn) => {
    const needle = q.trim().toLowerCase()
    if (!needle) return true
    const hay = [
      w.playerNo != null ? String(w.playerNo) : '',
      w.panelId != null ? String(w.panelId) : '',
      w.panelName ?? '',
      w.user ?? '',
      w.phone ?? '',
      w.orderNo ?? '',
      w.method ?? '',
      w.status ?? '',
    ]
      .join(' ')
      .toLowerCase()
    return hay.includes(needle)
  }

  const pendingHoldAll = useMemo(
    () => withdrawals.filter((w) => w.status === 'pending' && !w.c2cReleased),
    [withdrawals],
  )
  const pendingC2cAll = useMemo(
    () => withdrawals.filter((w) => w.status === 'pending' && w.c2cReleased),
    [withdrawals],
  )
  const approvedAll = useMemo(() => withdrawals.filter((w) => w.status === 'approved'), [withdrawals])
  const rejectedAll = useMemo(() => withdrawals.filter((w) => w.status === 'rejected'), [withdrawals])

  const pendingHold = useMemo(() => pendingHoldAll.filter(matchTxn), [pendingHoldAll, q])
  const pendingC2c = useMemo(() => pendingC2cAll.filter(matchTxn), [pendingC2cAll, q])
  const approved = useMemo(() => approvedAll.filter(matchTxn), [approvedAll, q])
  const rejected = useMemo(() => rejectedAll.filter(matchTxn), [rejectedAll, q])
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected])

  async function sendToC2c() {
    const n = Math.floor(Number(sendCount) || 0)
    if (n <= 0) return
    setBusy(true)
    try {
      await releaseWithdrawalsToC2c(n)
      setSelected({})
    } finally {
      setBusy(false)
    }
  }

  async function sendSelected() {
    if (!selectedIds.length) return
    setBusy(true)
    try {
      await releaseWithdrawalIdsToC2c(selectedIds)
      setSelected({})
    } finally {
      setBusy(false)
    }
  }

  async function recallFromC2c() {
    const n = Math.floor(Number(recallCount) || 0)
    if (n <= 0) return
    setBusy(true)
    try {
      await recallWithdrawalsFromC2c(n)
    } finally {
      setBusy(false)
    }
  }

  function toggleAllHold(on: boolean) {
    const next: Record<string, boolean> = {}
    if (on) for (const w of pendingHoldAll) next[w.id] = true
    setSelected(next)
  }

  return (
    <>
      <PageHead title="Withdrawals" subtitle="New withdraws go to C2C merchants automatically · admin can still pay or recall" />

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <input
          type="search"
          placeholder="Search Game ID, panel, phone, order…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: '100%', maxWidth: 420, padding: '8px 12px' }}
        />
      </div>
      <div className="grid grid-2" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 24 }}>
        <div className="card card-pad">
          <h3 className="section-title">Withdrawal limits</h3>
          <p className="section-sub">Per-transaction minimum and maximum.</p>
          <div className="form-grid">
            <div className="fld">
              <label>Minimum</label>
              <div className="inp-group">
                <span className="addon">Rs </span>
                <input
                  type="number"
                  value={s.minWithdraw}
                  onChange={(e) => patchSettings({ minWithdraw: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="fld">
              <label>Maximum</label>
              <div className="inp-group">
                <span className="addon">Rs </span>
                <input
                  type="number"
                  value={s.maxWithdraw}
                  onChange={(e) => patchSettings({ maxWithdraw: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="section-title">Withdrawal methods</h3>
          <p className="section-sub">Toggle which channels players can cash out through.</p>
          {(
            [
              ['Jazzcash', 'methodJazzcash'],
              ['Easypaisa', 'methodEasypaisa'],
              ['Bank account', 'methodBank'],
            ] as const
          ).map(([label, key]) => (
            <div className="field-row" key={key}>
              <div className="fr-info">
                <b>{label}</b>
              </div>
              <div className="fr-control">
                <button
                  className={'sw' + (s[key] ? ' on' : '')}
                  onClick={() => patchSettings({ [key]: !s[key] } as any)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <h3 className="section-title">Withdraw status</h3>
        <p className="section-sub">New player withdraws enter the C2C pool automatically. Use Send/Recall only if you need to move items between admin and C2C.</p>
        <div className="flex gap8" style={{ flexWrap: 'wrap', marginTop: 12 }}>
          <Pill tone="amber">Pending hold {pendingHoldAll.length}</Pill>
          <Pill tone="violet">In C2C pool {pendingC2cAll.length}</Pill>
          <Pill tone="green">Approved {approvedAll.length}</Pill>
          <Pill tone="red">Rejected {rejectedAll.length}</Pill>
          <Pill tone="blue">Total pending {pendingHoldAll.length + pendingC2cAll.length}</Pill>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'flex-end',
            marginTop: 18,
            paddingTop: 16,
            borderTop: '1px solid var(--line, #e8e8f0)',
          }}
        >
          <div className="fld" style={{ margin: 0, minWidth: 140 }}>
            <label>Send to C2C</label>
            <input
              type="number"
              min={1}
              max={pendingHoldAll.length || 1}
              value={sendCount}
              onChange={(e) => setSendCount(Number(e.target.value))}
            />
          </div>
          <button className="btn btn-primary" disabled={busy || pendingHoldAll.length === 0} onClick={() => void sendToC2c()}>
            Transfer {sendCount} to C2C
          </button>
          <button
            className="btn btn-outline"
            disabled={busy || selectedIds.length === 0}
            onClick={() => void sendSelected()}
          >
            Send selected ({selectedIds.length})
          </button>
          <div style={{ flex: 1 }} />
          <div className="fld" style={{ margin: 0, minWidth: 120 }}>
            <label>Recall from C2C</label>
            <input
              type="number"
              min={1}
              max={pendingC2cAll.length || 1}
              value={recallCount}
              onChange={(e) => setRecallCount(Number(e.target.value))}
            />
          </div>
          <button className="btn btn-ghost" disabled={busy || pendingC2cAll.length === 0} onClick={() => void recallFromC2c()}>
            Recall {recallCount}
          </button>
        </div>
        <p className="section-sub" style={{ marginTop: 10 }}>
          Example: 500 pending on hold → send 300 to C2C → pay the other 200 yourself (Pay / Reject).
        </p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h3>Pending — admin hold ({pendingHold.length})</h3>
          <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={pendingHoldAll.length > 0 && selectedIds.length === pendingHoldAll.length}
              onChange={(e) => toggleAllHold(e.target.checked)}
            />
            Select all
          </label>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }} />
                <th>Panel ID</th>
                <th>Player</th>
                <th>Order number</th>
                <th>Method</th>
                <th className="t-right">Amount</th>
                <th>Time</th>
                <th>Status</th>
                <th className="t-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingHold.map((w) => (
                <WithdrawRow
                  key={w.id}
                  w={w}
                  selected={!!selected[w.id]}
                  onToggle={() => setSelected((prev) => ({ ...prev, [w.id]: !prev[w.id] }))}
                  onAssign={() => setAssignId(w.id)}
                  onPay={() => setTxnStatus('withdrawals', w.id, 'approved')}
                  onReject={() => setTxnStatus('withdrawals', w.id, 'rejected')}
                  onSendOne={() => void releaseWithdrawalIdsToC2c([w.id])}
                />
              ))}
              {pendingHold.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                    No withdrawals on admin hold
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head">
          <h3>Pending — C2C pool ({pendingC2c.length})</h3>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Panel ID</th>
                <th>Player</th>
                <th>Order number</th>
                <th>Method</th>
                <th className="t-right">Amount</th>
                <th>Time</th>
                <th>Status</th>
                <th className="t-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingC2c.map((w) => (
                <WithdrawRow
                  key={w.id}
                  w={w}
                  onAssign={() => setAssignId(w.id)}
                  onPay={() => setTxnStatus('withdrawals', w.id, 'approved')}
                  onReject={() => setTxnStatus('withdrawals', w.id, 'rejected')}
                />
              ))}
              {pendingC2c.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                    Nothing in C2C pool — transfer from admin hold above
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>History — approved / rejected</h3>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Panel ID</th>
                <th>Player</th>
                <th>Order number</th>
                <th>Method</th>
                <th className="t-right">Amount</th>
                <th>Time</th>
                <th>Status</th>
                <th className="t-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...approved, ...rejected].map((w) => (
                <WithdrawRow
                  key={w.id}
                  w={w}
                  onAssign={() => {}}
                  onPay={() => {}}
                  onReject={() => {}}
                />
              ))}
              {approved.length + rejected.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                    No paid / rejected withdrawals yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {assignId && (
        <Modal title="Assign to agent (pay on behalf)" onClose={() => setAssignId(null)}>
          <p className="section-sub">Releases this withdraw to that merchant immediately.</p>
          {activeAgents.length === 0 && <div className="muted">No active agents available.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeAgents.map((a) => (
              <button
                key={a.id}
                className="btn btn-outline"
                style={{ justifyContent: 'space-between' }}
                onClick={() => {
                  assignWithdrawal(assignId, a.id)
                  setAssignId(null)
                }}
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
