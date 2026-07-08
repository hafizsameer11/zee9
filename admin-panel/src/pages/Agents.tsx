import { PageHead, Pill, Toggle, Avatar, Wallets, StatCard, money } from '../components/ui'
import { useAdmin } from '../data/store'

export default function Agents() {
  const { agents, updateAgent, settings } = useAdmin()
  const active = agents.filter((a) => a.active).length
  const totalCommission = agents.reduce((s, a) => s + a.commission, 0)
  const totalRefs = agents.reduce((s, a) => s + a.referrals, 0)

  return (
    <>
      <PageHead
        title="Agents"
        subtitle={`Agentship activates after ${settings.walletsRequired} wallets · min ${money(settings.minPerWallet)} deposit each`}
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard icon="agents" tone="violet" value={`${active}/${agents.length}`} label="Active agents" />
        <StatCard icon="referrals" tone="green" value={String(totalRefs)} label="Total referrals" />
        <StatCard icon="money" tone="gold" value={money(totalCommission)} label="Commission paid" />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Level</th>
                <th style={{ width: 130 }}>Wallets</th>
                <th className="t-right">Referrals</th>
                <th className="t-right">Commission</th>
                <th>Joined</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => {
                const ready = a.walletsFilled >= settings.walletsRequired
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="cell-media">
                        <Avatar name={a.name} />
                        <div>
                          <div className="cell-main">{a.name}</div>
                          <div className="cell-sub">{a.id} · {a.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Pill tone={a.level === 1 ? 'violet' : a.level === 2 ? 'blue' : 'grey'}>Level {a.level}</Pill>
                    </td>
                    <td>
                      <div className="flex gap8">
                        <Wallets filled={a.walletsFilled} total={settings.walletsRequired} />
                        <span className="muted" style={{ fontSize: 12 }}>{a.walletsFilled}/{settings.walletsRequired}</span>
                      </div>
                      {!ready && <div className="cell-sub red-t">Not eligible</div>}
                    </td>
                    <td className="t-right num">{a.referrals}</td>
                    <td className="t-right num cell-main gold-t">{money(a.commission)}</td>
                    <td className="muted">{a.joined}</td>
                    <td>
                      <div className="flex gap8">
                        <Toggle on={a.active} onChange={() => updateAgent(a.id, { active: !a.active })} />
                        {a.active ? <Pill tone="green">On</Pill> : <Pill tone="grey">Off</Pill>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
