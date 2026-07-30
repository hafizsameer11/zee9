import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, fmt } from '../components/ui'
import { useStore } from '../data/store'

export default function Home() {
  const nav = useNavigate()
  const { summary, loadError, reload } = useStore()

  if (!summary) {
    return (
      <Shell>
        <StatusBar />
        <div className="scroll pad" style={{ textAlign: 'center', paddingTop: 48 }}>
          {loadError ? (
            <>
              <div style={{ marginBottom: 14, opacity: 0.95 }}>{loadError}</div>
              <button className="btn btn-gold" onClick={() => void reload().catch(() => {})}>
                Retry
              </button>
            </>
          ) : (
            'Loading…'
          )}
        </div>
      </Shell>
    )
  }

  const links = [
    { to: '/members', label: 'All members' },
    { to: '/agents', label: 'Referral agents' },
    { to: '/reports/deposits', label: 'Deposit reports' },
    { to: '/reports/withdrawals', label: 'Withdrawal reports' },
    { to: '/reports/bets', label: 'Betting reports' },
    { to: '/commissions', label: 'Commission history' },
  ]

  return (
    <Shell>
      <StatusBar />
      <div className="topbar">
        <button className="tb-btn" onClick={() => nav('/profile')}>
          &#9776;
        </button>
        <div className="tb-title">{summary.channel.name}</div>
        <span className="tb-spacer" />
      </div>
      <div className="scroll pad">
        <div className="card balance-card">
          <div className="balance-col">
            <h3>Members</h3>
            <div className="num">{summary.members}</div>
            <div className="sub violet">Agents {summary.referralAgents}</div>
          </div>
          <div className="balance-col">
            <h3>Commission</h3>
            <div className="num gold">{fmt(summary.commissionBalance)}</div>
            <div className="sub gold">Week {fmt(summary.earnedWeek)}</div>
          </div>
        </div>
        <div className="card" style={{ padding: 14, marginBottom: 12, fontSize: 13 }}>
          Rates L1 {summary.rates.l1}% · L2 {summary.rates.l2}% · L3 {summary.rates.l3}%
          <div style={{ marginTop: 6, opacity: 0.8 }}>Share: zee9.roadmaster.pro{summary.sharePath}</div>
        </div>
        {links.map((l) => (
          <button key={l.to} className="btn btn-violet btn-block" style={{ marginBottom: 10 }} onClick={() => nav(l.to)}>
            {l.label}
          </button>
        ))}
      </div>
    </Shell>
  )
}
