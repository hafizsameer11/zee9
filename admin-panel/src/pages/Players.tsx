import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHead, Pill, Avatar, money } from '../components/ui'
import { useAdmin } from '../data/store'
import { api } from '../api/client'
import type { Player } from '../data/mock'

const STATUS_TONE: Record<string, string> = { active: 'green', banned: 'red', new: 'blue' }

function PlayerActions({
  p,
  onMakeAgent,
  onOpen,
  onBan,
  onUnban,
}: {
  p: Player
  onMakeAgent: () => void
  onOpen: () => void
  onBan: () => void
  onUnban: () => void
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (p.status === 'banned') {
    return (
      <button type="button" className="btn btn-success btn-sm" onClick={onUnban}>
        Unban
      </button>
    )
  }

  return (
    <div ref={wrap} style={{ position: 'relative', display: 'inline-flex', gap: 8, justifyContent: 'flex-end' }}>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen((v) => !v)}>
        More ▾
      </button>
      <button type="button" className="btn btn-light btn-sm" onClick={onOpen}>
        Open
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 4,
            minWidth: 200,
            background: '#fff',
            border: '1px solid #e4e4ef',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(20,18,50,.14)',
            zIndex: 30,
            padding: 6,
          }}
        >
          {!p.referralAgentActive && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 4 }}
              onClick={() => {
                setOpen(false)
                onMakeAgent()
              }}
              title="Referral Agentship"
            >
              Make Agent
            </button>
          )}
          {p.referralAgentActive && (
            <div className="muted" style={{ fontSize: 12, padding: '6px 8px' }}>
              Agentship: On
            </div>
          )}
          <button
            type="button"
            className="btn btn-danger btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => {
              setOpen(false)
              onBan()
            }}
          >
            Ban
          </button>
        </div>
      )}
    </div>
  )
}

export default function Players() {
  const { players, updatePlayer, makeReferralAgent, showToast } = useAdmin()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'banned' | 'new'>('all')
  const [searching, setSearching] = useState(false)

  async function promoteAgentship(id: string) {
    try {
      await makeReferralAgent(id, true)
    } catch (err: any) {
      showToast(err?.message || 'Failed to enable agentship')
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
        const local = players.find(
          (p) =>
            String(p.playerNo ?? '') === term ||
            p.id.endsWith(term) ||
            p.id === term ||
            p.phone.includes(term),
        )
        if (local) {
          nav(`/users/${local.id}`)
          return
        }
        showToast('No player found for that ID / phone / name')
        return
      }
      const exact = list.find(
        (u: any) =>
          String(u.playerNo) === term ||
          u.id === term ||
          u.id.endsWith(term),
      )
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
        p.id.endsWith(q.trim()) ||
        String(p.playerNo ?? '').includes(q.trim())),
  )

  return (
    <>
      <PageHead title="Players" subtitle={`${players.length} registered players — Make Agent = agentship`} />

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
                  <td>
                    <code>{p.playerNo != null ? p.playerNo : p.id.slice(-8)}</code>
                    <div className="cell-sub" style={{ marginTop: 2 }}>
                      {p.role === 'AGENT' && <Pill tone="violet">C2C</Pill>}
                      {p.referralAgentActive && <Pill tone="blue">Agent</Pill>}
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
                  <td className="t-right" onClick={(e) => e.stopPropagation()}>
                    <PlayerActions
                      p={p}
                      onMakeAgent={() => void promoteAgentship(p.id)}
                      onOpen={() => nav(`/users/${p.id}`)}
                      onBan={() => {
                        updatePlayer(p.id, { status: 'banned' })
                        showToast('Player banned')
                      }}
                      onUnban={() => {
                        updatePlayer(p.id, { status: 'active' })
                        showToast('Player unbanned')
                      }}
                    />
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
