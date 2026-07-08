import { PageHead, StatCard, Pill, money, compact } from '../components/ui'
import { Icons } from '../components/icons'
import { useAdmin } from '../data/store'
import { REVENUE_SERIES } from '../data/mock'

export default function Dashboard() {
  const { players, agents, games, withdrawals, deposits, settings } = useAdmin()

  const totalGGR = games.reduce((s, g) => s + g.ggr, 0)
  const activeAgents = agents.filter((a) => a.active).length
  const pendingW = withdrawals.filter((w) => w.status === 'pending')
  const totalDeposited = players.reduce((s, p) => s + p.deposited, 0)
  const maxBar = Math.max(...REVENUE_SERIES.map((r) => Math.max(r.dep, r.wd)))
  const topGames = [...games].sort((a, b) => b.ggr - a.ggr).slice(0, 5)

  return (
    <>
      <PageHead
        title="Dashboard"
        subtitle={`Live overview of your ${settings.platformName} platform`}
        actions={
          <>
            <button className="btn btn-outline">Export</button>
            <button className="btn btn-primary">{Icons.plus} Quick action</button>
          </>
        }
      />

      <div className="grid grid-4">
        <StatCard icon="money" tone="violet" value={money(totalGGR)} label="Gross Gaming Revenue" trend={{ dir: 'up', val: '12.4%' }} />
        <StatCard icon="players" tone="green" value={compact(players.length * 1240)} label="Registered Players" trend={{ dir: 'up', val: '8.1%' }} />
        <StatCard icon="deposit" tone="blue" value={money(totalDeposited)} label="Total Deposits" trend={{ dir: 'up', val: '5.6%' }} />
        <StatCard icon="agents" tone="gold" value={`${activeAgents}/${agents.length}`} label="Active Agents" trend={{ dir: 'down', val: '2.0%' }} />
      </div>

      <div className="grid grid-2 mt24" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Deposits vs Withdrawals</h3>
              <div className="sub">This week · in thousands ({settings.currency})</div>
            </div>
            <div className="flex gap16" style={{ fontSize: 12, fontWeight: 700 }}>
              <span className="flex gap8"><i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--brand)' }} /> Deposits</span>
              <span className="flex gap8"><i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--gold)' }} /> Withdrawals</span>
            </div>
          </div>
          <div className="card-pad">
            <div className="bars">
              {REVENUE_SERIES.map((r) => (
                <div key={r.d} style={{ flex: 1, display: 'flex', gap: 5, alignItems: 'flex-end', height: '100%' }}>
                  <div className="bar" style={{ height: `${(r.dep / maxBar) * 100}%` }} title={`Deposits ${r.dep}K`} />
                  <div className="bar alt" style={{ height: `${(r.wd / maxBar) * 100}%` }} title={`Withdrawals ${r.wd}K`} />
                </div>
              ))}
            </div>
            <div className="bars-x">
              {REVENUE_SERIES.map((r) => (
                <span key={r.d}>{r.d}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Top Games by Revenue</h3>
          </div>
          <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {topGames.map((g) => {
              const pct = Math.round((g.ggr / topGames[0].ggr) * 100)
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
                    <td className="cell-main">{w.id}</td>
                    <td>{w.user}</td>
                    <td>
                      <Pill tone="violet">{w.method}</Pill>
                    </td>
                    <td className="t-right num cell-main">{money(w.amount)}</td>
                    <td className="t-right muted">{w.time.slice(11)}</td>
                  </tr>
                ))}
                {pendingW.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 30 }}>
                      All caught up 🎉
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Live Config Snapshot</h3>
          </div>
          <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              ['Registration bonus', money(settings.registrationBonus)],
              ['Daily open bonus', money(settings.dailyOpenBonus)],
              ['Commission (L1/L2/L3)', `${settings.commissionL1}/${settings.commissionL2}/${settings.commissionL3}%`],
              ['Withdraw range', `${money(settings.minWithdraw)} – ${money(settings.maxWithdraw)}`],
              ['Deposit range', `${money(settings.minDeposit)} – ${money(settings.maxDeposit)}`],
              ['Wager (bonus / deposit)', `${settings.bonusWager}x / ${settings.depositWager}x`],
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
