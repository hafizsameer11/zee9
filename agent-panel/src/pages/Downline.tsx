import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, fmt } from '../components/ui'
import { api } from '../api/client'

type Row = {
  level: number
  id: string
  name: string
  phone: string
  deposited: number
  wagered: number
}

export default function Downline() {
  const nav = useNavigate()
  const [items, setItems] = useState<Row[]>([])

  useEffect(() => {
    void api.get('/referral-agent/downline').then((d) => setItems(d.items || []))
  }, [])

  return (
    <Shell>
      <StatusBar />
      <div className="topbar">
        <button className="tb-btn" onClick={() => nav(-1)}>
          ‹
        </button>
        <div className="tb-title">Downline L3→L1</div>
        <span className="tb-spacer" />
      </div>
      <div className="scroll pad">
        {items.map((r) => (
          <div key={`${r.level}-${r.id}`} className="card" style={{ padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <b>
                L{r.level} · {r.name}
              </b>
              <span>{r.phone}</span>
            </div>
            <div style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>
              Dep {fmt(r.deposited)} · Wager {fmt(r.wagered)}
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="card" style={{ padding: 20 }}>No downline yet.</div>}
      </div>
    </Shell>
  )
}
