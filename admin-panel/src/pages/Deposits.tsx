import { useMemo, useState } from 'react'
import { PageHead, Pill, money } from '../components/ui'
import { useAdmin } from '../data/store'
import { api } from '../api/client'

const TONE: Record<string, string> = { pending: 'amber', approved: 'green', rejected: 'red' }

export default function Deposits() {
  const { deposits, settings, patchSettings, reset, showToast } = useAdmin()
  const s = settings
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return deposits
    return deposits.filter((d) => {
      const hay = [
        d.playerNo != null ? String(d.playerNo) : '',
        d.panelId != null ? String(d.panelId) : '',
        d.panelName ?? '',
        d.user ?? '',
        d.phone ?? '',
        d.orderNo ?? '',
        d.method ?? '',
        d.status ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [deposits, q])

  async function manualDone(id: string, orderNo?: string | null) {
    if (
      !window.confirm(
        `Manual Done for ${orderNo || id}?\n\nPlayer wallet will be credited and this amount will be cut from the C2C merchant float (same as merchant confirm).`,
      )
    ) {
      return
    }
    setBusyId(id)
    try {
      await api.post(`/admin/deposits/${id}/manual-done`)
      showToast('Manual Done — player credited, merchant float cut')
      reset()
    } catch (e: any) {
      showToast(e?.message || 'Manual Done failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHead
        title="Deposits"
        subtitle="C2C merchants confirm/reject — admin can Manual Done rejected orders when player proves payment"
      />

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

      <div className="card card-pad" style={{ marginBottom: 24, background: '#f5f4ff' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#444', lineHeight: 1.5 }}>
          Normal flow: C2C merchant confirms in Collections. If they reject but player sends proof, click{' '}
          <b>Approved</b> on a rejected row — same money path (player credited, merchant float − amount + reward).
          C2C panel then shows <b>Fail</b> + <b>Manual Done</b>.
        </p>
      </div>

      <div className="card">
        <div className="card-head" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <h3>Deposit requests</h3>
          <input
            type="search"
            placeholder="Search Game ID, panel, phone, order…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 240, padding: '8px 12px' }}
          />
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Panel ID</th>
                <th>Player</th>
                <th>Method</th>
                <th className="t-right">Amount</th>
                <th>Time</th>
                <th>Status</th>
                <th>Order number</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="cell-main" style={{ fontWeight: 800 }}>
                      {d.panelId != null ? `Panel ID # ${d.panelId}` : '—'}
                    </div>
                    {d.panelName && <div className="cell-sub">{d.panelName}</div>}
                  </td>
                  <td>
                    <div className="cell-main" style={{ fontWeight: 800 }}>
                      {d.playerNo != null ? `Game ID ${d.playerNo}` : d.user}
                    </div>
                    <div className="cell-sub">{d.user}{d.phone ? ` · ${d.phone}` : ''}</div>
                  </td>
                  <td><Pill tone="blue">{d.method}</Pill></td>
                  <td className="t-right num cell-main">{money(d.amount)}</td>
                  <td className="muted">{d.time}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                      {d.manualDone ? (
                        <>
                          <Pill tone="red">rejected</Pill>
                          <Pill tone="green">Manual Done</Pill>
                        </>
                      ) : (
                        <Pill tone={TONE[d.status]}>{d.status}</Pill>
                      )}
                      {d.status === 'rejected' && !d.manualDone && d.orderNo && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={busyId === d.id}
                          onClick={() => void manualDone(d.id, d.orderNo)}
                        >
                          {busyId === d.id ? '…' : 'Approved'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="num" style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                    {d.orderNo || '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 30 }}>
                    {deposits.length === 0 ? 'No deposits yet' : 'No matches'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
