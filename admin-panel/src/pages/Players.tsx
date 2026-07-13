import { useState } from 'react'
import { PageHead, Pill, Avatar, money } from '../components/ui'
import { useAdmin } from '../data/store'
import type { AgentCreds } from '../data/store'
import { CredsModal } from '../components/CredsModal'

const STATUS_TONE: Record<string, string> = { active: 'green', banned: 'red', new: 'blue' }

export default function Players() {
  const { players, updatePlayer, makeAgent, showToast } = useAdmin()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'banned' | 'new'>('all')
  const [creds, setCreds] = useState<AgentCreds | null>(null)

  async function promote(id: string) {
    try {
      setCreds(await makeAgent(id))
    } catch (e: any) {
      showToast(e?.message || 'Failed to promote')
    }
  }

  const rows = players.filter(
    (p) =>
      (filter === 'all' || p.status === filter) &&
      (p.name.toLowerCase().includes(q.toLowerCase()) || p.phone.includes(q)),
  )

  return (
    <>
      <PageHead title="Players" subtitle={`${players.length} registered players`} />

      <div className="flex between" style={{ marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div className="tabs-bar" style={{ marginBottom: 0 }}>
          {(['all', 'active', 'new', 'banned'] as const).map((f) => (
            <button key={f} className={'tab-btn' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <input className="inp" style={{ maxWidth: 260 }} placeholder="Search name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Player</th>
                <th>VIP</th>
                <th className="t-right">Balance</th>
                <th className="t-right">Bonus</th>
                <th className="t-right">Deposited</th>
                <th className="t-right">Withdrawn</th>
                <th>Referred by</th>
                <th>Status</th>
                <th className="t-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="cell-media">
                      <Avatar name={p.name} />
                      <div>
                        <div className="cell-main">{p.name}</div>
                        <div className="cell-sub">{p.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Pill tone="gold">VIP {p.vip}</Pill>
                  </td>
                  <td className="t-right num cell-main">{money(p.balance)}</td>
                  <td className="t-right num gold-t">{money(p.bonus)}</td>
                  <td className="t-right num">{money(p.deposited)}</td>
                  <td className="t-right num">{money(p.withdrawn)}</td>
                  <td className="muted">{p.referredBy ?? '—'}</td>
                  <td>
                    <Pill tone={STATUS_TONE[p.status]}>{p.status}</Pill>
                  </td>
                  <td className="t-right">
                    {p.status === 'banned' ? (
                      <button className="btn btn-success btn-sm" onClick={() => { updatePlayer(p.id, { status: 'active' }); showToast('Player unbanned') }}>
                        Unban
                      </button>
                    ) : (
                      <div className="flex gap8" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => promote(p.id)} title="Generate C2C agent login">
                          Make agent
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => { updatePlayer(p.id, { status: 'banned' }); showToast('Player banned') }}>
                          Ban
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creds && <CredsModal creds={creds} onClose={() => setCreds(null)} />}
    </>
  )
}
