import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, fmt } from '../components/ui'
import { api } from '../api/client'

type Row = {
  id: string
  gameId?: string
  playerNo?: number
  name: string
  phone: string
  isReferralAgent: boolean
  deposited: number
  withdrawn: number
  status: string
}

export default function Members({ agentsOnly = false }: { agentsOnly?: boolean }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Row[]>([])

  useEffect(() => {
    const path = `/mentor/members?${agentsOnly ? 'agents=true&' : ''}q=${encodeURIComponent(q)}`
    const t = window.setTimeout(() => {
      void api.get(path).then((d) => setItems(d.items || []))
    }, 200)
    return () => window.clearTimeout(t)
  }, [q, agentsOnly])

  return (
    <Shell>
      <StatusBar />
      <div className="topbar">
        <button className="tb-btn" onClick={() => nav(-1)}>
          ‹
        </button>
        <div className="tb-title">{agentsOnly ? 'Agents' : 'Members'}</div>
        <span className="tb-spacer" />
      </div>
      <div className="scroll pad">
        <input
          className="card"
          style={{ padding: 12, marginBottom: 12, width: '100%', border: 0 }}
          placeholder="Search phone / name / game id"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {items.map((r) => {
          const gameId = r.gameId || (r.playerNo != null ? String(r.playerNo) : r.id.slice(-8))
          return (
            <div key={r.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <b>Game ID #{gameId}</b>
                <span>{r.phone}</span>
              </div>
              <div style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>{r.name}</div>
              <div style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>
                {r.isReferralAgent ? 'Referral agent · ' : ''}
                {r.status} · Dep {fmt(r.deposited)} · WD {fmt(r.withdrawn)}
              </div>
            </div>
          )
        })}
      </div>
    </Shell>
  )
}
