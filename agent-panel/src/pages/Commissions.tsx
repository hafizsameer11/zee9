import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, fmt } from '../components/ui'
import { api } from '../api/client'

type Row = { id: string; level: number; amount: number; status: string; at: string; source: string }

export default function Commissions() {
  const nav = useNavigate()
  const [rows, setRows] = useState<Row[]>([])
  useEffect(() => {
    void api.get('/referral-agent/commissions').then(setRows)
  }, [])
  return (
    <Shell>
      <StatusBar />
      <div className="topbar">
        <button className="tb-btn" onClick={() => nav(-1)}>
          ‹
        </button>
        <div className="tb-title">Commissions</div>
        <span className="tb-spacer" />
      </div>
      <div className="scroll pad">
        {rows.map((r) => (
          <div key={r.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <b>
                L{r.level} · {r.source}
              </b>
              <span style={{ color: r.amount < 0 ? '#ff8a80' : '#ffe082' }}>{fmt(r.amount)}</span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
              {r.status} · {new Date(r.at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  )
}
