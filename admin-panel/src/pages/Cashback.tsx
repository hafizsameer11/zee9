import { PageHead, Toggle, Range, money } from '../components/ui'
import { Icons } from '../components/icons'
import { useAdmin } from '../data/store'

export default function Cashback() {
  const { cashback, updateCashback, addCashback } = useAdmin()

  return (
    <>
      <PageHead
        title="Cashback"
        subtitle="Loss-based cashback tiers shown on the cashback cards"
        actions={<button className="btn btn-primary" onClick={addCashback}>{Icons.plus} Add tier</button>}
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
              <Toggle on={t.enabled} onChange={() => updateCashback(t.id, { enabled: !t.enabled })} />
            </div>

            <div className="fld" style={{ marginBottom: 14 }}>
              <label>Cashback percentage</label>
              <Range value={t.pct} min={1} max={30} onChange={(v) => updateCashback(t.id, { pct: v })} />
            </div>

            <div className="form-grid">
              <div className="fld">
                <label>Min weekly loss</label>
                <div className="inp-group"><span className="addon">₹</span><input type="number" value={t.minLoss} onChange={(e) => updateCashback(t.id, { minLoss: Number(e.target.value) })} /></div>
              </div>
              <div className="fld">
                <label>Max claim</label>
                <div className="inp-group"><span className="addon">₹</span><input type="number" value={t.maxClaim} onChange={(e) => updateCashback(t.id, { maxClaim: Number(e.target.value) })} /></div>
              </div>
            </div>

            <div className="card" style={{ background: 'var(--surface-2)', boxShadow: 'none', marginTop: 14, padding: 12, borderRadius: 10, fontSize: 12.5 }}>
              <span className="muted">Lose {money(t.minLoss)}+ this week → get </span>
              <b className="green-t">{t.pct}% back</b>
              <span className="muted"> up to {money(t.maxClaim)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
