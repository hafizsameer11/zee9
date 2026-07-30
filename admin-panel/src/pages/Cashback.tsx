import { PageHead, Toggle, money } from '../components/ui'
import { useAdmin } from '../data/store'

export default function Cashback() {
  const { settings, patchSettings, cashback, updateCashback, addCashback, deleteCashback } = useAdmin()
  const s = settings

  return (
    <>
      <PageHead
        title="Bet Rebate"
        subtitle="50k loss → wait 24h → claim fixed ReBet (game BET REBATE screen)"
        actions={<button className="btn btn-primary" onClick={() => patchSettings({})}>Save</button>}
      />

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 className="section-title">Bet Rebate rule</h3>
        <div className="field-row">
          <div className="fr-info">
            <b>Enabled</b>
            <span>Show / allow Bet Rebate claims in game</span>
          </div>
          <div className="fr-control">
            <Toggle on={s.rebetBonus !== false} onChange={() => patchSettings({ rebetBonus: s.rebetBonus === false })} />
          </div>
        </div>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="fld">
            <label>Min loss to qualify</label>
            <div className="inp-group">
              <span className="addon">Rs </span>
              <input
                type="number"
                value={s.rebetMinLoss ?? 50000}
                onChange={(e) => patchSettings({ rebetMinLoss: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="fld">
            <label>ReBet amount</label>
            <div className="inp-group">
              <span className="addon">Rs </span>
              <input
                type="number"
                value={s.rebetAmount ?? 600}
                onChange={(e) => patchSettings({ rebetAmount: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="fld">
            <label>Wait after qualify</label>
            <div className="inp-group">
              <span className="addon">h </span>
              <input
                type="number"
                value={s.rebetDelayHours ?? 24}
                onChange={(e) => patchSettings({ rebetDelayHours: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
        <p className="hint" style={{ marginTop: 10 }}>
          Example: lose {money(s.rebetMinLoss ?? 50000)} → wait {s.rebetDelayHours ?? 24}h → claim {money(s.rebetAmount ?? 600)}.
        </p>
      </div>

      <PageHead
        title="Legacy cashback tiers"
        subtitle="Optional display tiers (Bet Rebate above is what the game uses)"
        actions={<button className="btn btn-outline" onClick={addCashback}>Add tier</button>}
      />

      <div className="grid grid-2">
        {cashback.map((t) => (
          <div className="card card-pad" key={t.id}>
            <div className="flex between" style={{ marginBottom: 14 }}>
              <input
                className="inp"
                style={{ maxWidth: 180, fontWeight: 800, fontSize: 16 }}
                value={t.name}
                onChange={(e) => updateCashback(t.id, { name: e.target.value })}
              />
              <div className="flex gap8">
                <Toggle on={t.enabled} onChange={() => updateCashback(t.id, { enabled: !t.enabled })} />
                <button className="btn btn-outline btn-icon" onClick={() => deleteCashback(t.id)} title="Delete tier">×</button>
              </div>
            </div>
            <div className="form-grid">
              <div className="fld">
                <label>Min loss</label>
                <div className="inp-group"><span className="addon">Rs </span><input type="number" value={t.minLoss} onChange={(e) => updateCashback(t.id, { minLoss: Number(e.target.value) })} /></div>
              </div>
              <div className="fld">
                <label>Pct</label>
                <div className="inp-group"><span className="addon">% </span><input type="number" value={t.pct} onChange={(e) => updateCashback(t.id, { pct: Number(e.target.value) })} /></div>
              </div>
              <div className="fld">
                <label>Max claim</label>
                <div className="inp-group"><span className="addon">Rs </span><input type="number" value={t.maxClaim} onChange={(e) => updateCashback(t.id, { maxClaim: Number(e.target.value) })} /></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
