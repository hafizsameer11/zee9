import { PageHead, StatCard, Pill, money, compact } from '../components/ui'
import { useAdmin } from '../data/store'

export default function Dashboard() {
  const { agents, games, withdrawals, deposits, settings, revenueSeries, dashboard } = useAdmin()

  const activeAgents = agents.filter((a) => a.active).length
  const pendingW = withdrawals.filter((w) => w.status === 'pending')
  const maxBar = Math.max(1, ...revenueSeries.map((r) => Math.max(r.dep, r.wd)))
  const topGames = [...games].sort((a, b) => b.ggr - a.ggr).slice(0, 5)
  const topGgr = Math.max(1, topGames[0]?.ggr ?? 1)

  const playerCount = dashboard?.players ?? 0
  const totalDeposited = dashboard?.totalDeposited ?? 0
  const totalGGR = dashboard?.totalCommission ?? games.reduce((s, g) => s + g.ggr, 0)

  return (
    <>
      <PageHead title="Dashboard" subtitle={`Live overview of your ${settings.platformName} platform`} />

      <div className="grid grid-4">
        <StatCard icon="money" tone="violet" value={money(totalGGR)} label="Total Commission" />
        <StatCard icon="players" tone="green" value={compact(playerCount)} label="Registered Players" />
        <StatCard icon="deposit" tone="blue" value={money(totalDeposited)} label="Total Deposits" />
        <StatCard icon="agents" tone="gold" value={`${activeAgents}/${dashboard?.agents ?? agents.length}`} label="Active Agents" />
      </div>

      <div className="grid grid-2 mt24" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Deposits vs Withdrawals</h3>
              <div className="sub">This week ({settings.currency})</div>
            </div>
          </div>
          <div className="card-pad">
            <div className="bars">
              {revenueSeries.map((r) => (
                <div key={r.d} style={{ flex: 1, display: 'flex', gap: 5, alignItems: 'flex-end', height: '100%' }}>
                  <div className="bar" style={{ height: `${(r.dep / maxBar) * 100}%` }} title={`Deposits ${money(r.dep)}`} />
                  <div className="bar alt" style={{ height: `${(r.wd / maxBar) * 100}%` }} title={`Withdrawals ${money(r.wd)}`} />
                </div>
              ))}
            </div>
            <div className="bars-x">
              {revenueSeries.map((r) => (
                <span key={r.d}>{r.d}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Top Games by Revenue</h3></div>
          <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {topGames.map((g) => {
              const pct = Math.round((g.ggr / topGgr) * 100)
              return (
                <div key={g.id}>
                  <div className="flex between" style={{ marginBottom: 6 }}>
                    <span className="flex gap8" style={{ fontWeight: 700, fontSize: 13 }}>
                      <span style={{ fontSize: 18 }}>{g.emoji}</span> {g.title}
                    </span>
                    <b style={{ fontSize: 13 }}>{money(g.ggr)}</b>
                  </div>
                  <div style={{ height: 8, background: 'var(--line)', borderRadius: 5 }}>
                    <div style={{ width: pct + '%', height: '100%', borderRadius: 5, background: 'linear-gradient(90deg, var(--brand-2), var(--brand))' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-2 mt24" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        <div className="card">
          <div className="card-head">
            <h3>Pending Withdrawals</h3>
            <span className="pill amber">{pendingW.length} awaiting</span>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Player</th>
                  <th>Method</th>
                  <th className="t-right">Amount</th>
                  <th className="t-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {pendingW.map((w) => (
                  <tr key={w.id}>
                    <td className="cell-main">{w.id.slice(0, 8)}</td>
                    <td>{w.user}</td>
                    <td><Pill tone="violet">{w.method}</Pill></td>
                    <td className="t-right num cell-main">{money(w.amount)}</td>
                    <td className="t-right muted">{w.time.slice(11)}</td>
                  </tr>
                ))}
                {pendingW.length === 0 && (
                  <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 30 }}>All caught up</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Live Config Snapshot</h3></div>
          <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              ['Registration bonus', money(settings.registrationBonus)],
              ['Daily open bonus', money(settings.dailyOpenBonus)],
              ['Wheel deposit / spin', money(settings.wheelDepositPerSpin ?? 1000)],
              ['Commission (L1/L2/L3)', `${settings.commissionL1}/${settings.commissionL2}/${settings.commissionL3}%`],
              ['Withdraw range', `${money(settings.minWithdraw)} – ${money(settings.maxWithdraw)}`],
              ['Deposit range', `${money(settings.minDeposit)} – ${money(settings.maxDeposit)}`],
              ['Pending deposits', String(dashboard?.pendingDeposits ?? deposits.filter((d) => d.status === 'pending').length)],
            ].map(([k, v]) => (
              <div key={k} className="field-row" style={{ padding: '12px 0' }}>
                <span className="muted" style={{ fontSize: 13 }}>{k}</span>
                <b style={{ fontSize: 13.5 }}>{v}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
