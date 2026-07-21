import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHead, Pill, Avatar, money } from '../components/ui'
import { useAdmin } from '../data/store'
import type { AgentCreds } from '../data/store'
import { CredsModal } from '../components/CredsModal'
import { api } from '../api/client'

const STATUS_TONE: Record<string, string> = { active: 'green', banned: 'red', new: 'blue' }

export default function Players() {
  const { players, updatePlayer, makeAgent, showToast } = useAdmin()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'banned' | 'new'>('all')
  const [creds, setCreds] = useState<AgentCreds | null>(null)
  const [searching, setSearching] = useState(false)

  async function promote(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      setCreds(await makeAgent(id))
    } catch (err: any) {
      showToast(err?.message || 'Failed to promote')
    }
  }

  async function openBySearch() {
    const term = q.trim()
    if (!term) return
    setSearching(true)
    try {
      const res = await api.get(`/admin/users?q=${encodeURIComponent(term)}&limit=20`)
      const list = Array.isArray(res) ? res : (res?.items || [])
      if (list.length === 1) {
        nav(`/users/${list[0].id}`)
        return
      }
      if (list.length === 0) {
        const local = players.find((p) => p.id.endsWith(term) || p.id === term || p.phone.includes(term))
        if (local) {
          nav(`/users/${local.id}`)
          return
        }
        showToast('No player found for that ID / phone / name')
        return
      }
      const exact = list.find((u: any) => u.id === term || u.id.endsWith(term))
      if (exact) {
        nav(`/users/${exact.id}`)
        return
      }
      showToast(`${list.length} matches — pick from the table or refine search`)
    } catch (e: any) {
      showToast(e?.message || 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const rows = players.filter(
    (p) =>
      (filter === 'all' || p.status === filter) &&
      (!q.trim() ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.phone.includes(q) ||
        p.id.includes(q) ||
        p.id.endsWith(q.trim())),
  )

  return (
    <>
      <PageHead title="Players" subtitle={`${players.length} registered players — open any ID to edit balance, wager, profile`} />

      <div className="flex between" style={{ marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div className="tabs-bar" style={{ marginBottom: 0 }}>
          {(['all', 'active', 'new', 'banned'] as const).map((f) => (
            <button key={f} className={'tab-btn' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap8" style={{ flex: 1, justifyContent: 'flex-end', minWidth: 280 }}>
          <input
            className="inp"
            style={{ maxWidth: 320, flex: 1 }}
            placeholder="Game ID / phone / name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && openBySearch()}
          />
          <button className="btn btn-primary" disabled={searching || !q.trim()} onClick={openBySearch}>
            {searching ? '…' : 'Open ID'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Player</th>
                <th>Game ID</th>
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
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/users/${p.id}`)}>
                  <td>
                    <div className="cell-media">
                      <Avatar name={p.name} />
                      <div>
                        <div className="cell-main">{p.name}</div>
                        <div className="cell-sub">{p.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td><code>{p.id.slice(-8)}</code></td>
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
                  <td className="t-right" onClick={(e) => e.stopPropagation()}>
                    {p.status === 'banned' ? (
                      <button className="btn btn-success btn-sm" onClick={() => { updatePlayer(p.id, { status: 'active' }); showToast('Player unbanned') }}>
                        Unban
                      </button>
                    ) : (
                      <div className="flex gap8" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => promote(p.id, e)} title="Generate C2C agent login">
                          Make agent
                        </button>
                        <button className="btn btn-light btn-sm" onClick={() => nav(`/users/${p.id}`)}>
                          Open
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
