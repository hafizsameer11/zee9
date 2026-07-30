import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Shell, StatusBar, fmt } from '../components/ui'
import { api } from '../api/client'

export default function Reports() {
  const { kind } = useParams<{ kind: string }>()
  const nav = useNavigate()
  const [rows, setRows] = useState<any[]>([])
  const path =
    kind === 'withdrawals'
      ? '/mentor/reports/withdrawals'
      : kind === 'bets'
        ? '/mentor/reports/bets'
        : '/mentor/reports/deposits'

  useEffect(() => {
    void api.get(path).then(setRows)
  }, [path])

  return (
    <Shell>
      <StatusBar />
      <div className="topbar">
        <button className="tb-btn" onClick={() => nav(-1)}>
          ‹
        </button>
        <div className="tb-title">{kind} report</div>
        <span className="tb-spacer" />
      </div>
      <div className="scroll pad">
        {rows.map((r) => (
          <div key={r.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <b>{r.user}</b>
              <span>{fmt(r.amount ?? r.bet ?? 0)}</span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
              {r.phone} · {r.status || r.state || r.game} · {new Date(r.at).toLocaleString()}
              {r.payout != null ? ` · out ${fmt(r.payout)}` : ''}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  )
}
