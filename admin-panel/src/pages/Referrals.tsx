import { PageHead, Range, money } from '../components/ui'
import { useAdmin } from '../data/store'

export default function Referrals() {
  const { settings, patchSettings, agents } = useAdmin()
  const s = settings
  const topReferrers = [...agents].sort((a, b) => b.referrals - a.referrals).slice(0, 5)

  return (
    <>
      <PageHead
        title="Referrals & Commission"
        subtitle="Configure the 3-level agent commission structure and agentship rules"
        actions={<button className="btn btn-primary" onClick={() => patchSettings({})}>Save</button>}
      />

      <div className="grid grid-2" style={{ gridTemplateColumns: '1.2fr 1fr', alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="section-title">Commission by level</h3>
          <p className="section-sub">Only agents earn commission on their downline's activity.</p>

          {([
            ['Level 1 (direct)', 'commissionL1'],
            ['Level 2', 'commissionL2'],
            ['Level 3', 'commissionL3'],
          ] as const).map(([label, key]) => (
            <div className="field-row" key={key}>
              <div className="fr-info">
                <b>{label}</b>
                <span>Share of downline revenue</span>
              </div>
              <div className="fr-control" style={{ width: 220 }}>
                <Range value={s[key]} onChange={(v) => patchSettings({ [key]: v } as any)} />
              </div>
            </div>
          ))}

          <div className="divider" />

          <h3 className="section-title">Agentship activation</h3>
          <p className="section-sub">Rules a member must meet before becoming a commission-earning agent.</p>

          <div className="form-grid">
            <div className="fld">
              <label>Wallets required</label>
              <input type="number" value={s.walletsRequired} onChange={(e) => patchSettings({ walletsRequired: Number(e.target.value) })} />
              <div className="hint" style={{ marginTop: 6 }}>Completed wallets to activate agentship</div>
            </div>
            <div className="fld">
              <label>Min deposit per wallet</label>
              <div className="inp-group">
                <span className="addon">Rs </span>
                <input type="number" value={s.minPerWallet} onChange={(e) => patchSettings({ minPerWallet: Number(e.target.value) })} />
              </div>
              <div className="hint" style={{ marginTop: 6 }}>Each wallet must deposit this to count</div>
            </div>
          </div>

          <div className="divider" />

          <h3 className="section-title">C2C agent rewards</h3>
          <p className="section-sub">Collection / pay-on-behalf reward % and when earnings unlock.</p>
          <div className="form-grid">
            <div className="fld">
              <label>Reward on each deposit/payout (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={s.payoutReward ?? 2}
                onChange={(e) => patchSettings({ payoutReward: Number(e.target.value) })}
              />
              <div className="hint" style={{ marginTop: 6 }}>Default 2%. Agent never receives the deposit principal.</div>
            </div>
            <div className="fld">
              <label>Earnings hold (days)</label>
              <input
                type="number"
                min={0}
                max={90}
                value={s.agentEarnHoldDays ?? 7}
                onChange={(e) => patchSettings({ agentEarnHoldDays: Number(e.target.value) })}
              />
              <div className="hint" style={{ marginTop: 6 }}>After this many days, agent can move rewards into float.</div>
            </div>
          </div>

          <div className="card" style={{ background: 'var(--brand-soft)', boxShadow: 'none', marginTop: 18, padding: 16, borderRadius: 12 }}>
            <b style={{ color: 'var(--brand)' }}>Current rule:</b>{' '}
            <span style={{ color: 'var(--ink-2)' }}>
              Complete <b>{s.walletsRequired} wallets</b> of <b>{money(s.minPerWallet)}</b> each
              ({money(s.walletsRequired * s.minPerWallet)} total) to activate agentship and start earning{' '}
              <b>{s.commissionL1}% / {s.commissionL2}% / {s.commissionL3}%</b> across 3 levels.
            </span>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Top referrers</h3>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th className="t-right">Referrals</th>
                  <th className="t-right">Earned</th>
                </tr>
              </thead>
              <tbody>
                {topReferrers.map((a) => (
                  <tr key={a.id}>
                    <td className="cell-main">{a.name}</td>
                    <td className="t-right num">{a.referrals}</td>
                    <td className="t-right num gold-t">{money(a.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
