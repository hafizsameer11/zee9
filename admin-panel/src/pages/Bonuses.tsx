import { PageHead, Toggle, money } from '../components/ui'
import { useAdmin } from '../data/store'

function NumField({ label, value, onChange, suffix = '₹', hint }: { label: string; value: number; onChange: (v: number) => void; suffix?: string; hint?: string }) {
  return (
    <div className="fld">
      <label>{label} {hint && <span className="hint">— {hint}</span>}</label>
      <div className="inp-group">
        <span className="addon">{suffix}</span>
        <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
      </div>
    </div>
  )
}

export default function Bonuses() {
  const { settings, patchSettings } = useAdmin()
  const s = settings

  return (
    <>
      <PageHead
        title="Bonuses & Wager"
        subtitle="Registration, daily and deposit bonuses plus wagering requirements"
        actions={<button className="btn btn-primary" onClick={() => patchSettings({})}>Save all</button>}
      />

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="section-title">Sign-up & daily bonuses</h3>
          <p className="section-sub">One-time and recurring player rewards.</p>
          <div className="form-grid one">
            <NumField label="Registration bonus" value={s.registrationBonus} onChange={(v) => patchSettings({ registrationBonus: v })} hint="credited on account creation" />
            <NumField label="Daily game-open bonus" value={s.dailyOpenBonus} onChange={(v) => patchSettings({ dailyOpenBonus: v })} hint="once per day for opening a game" />
          </div>
          <div className="field-row mt16">
            <div className="fr-info">
              <b>Bonus withdrawal needs a deposit</b>
              <span>Player must deposit once before withdrawing the daily open bonus</span>
            </div>
            <div className="fr-control"><Toggle on={s.dailyOpenNeedsDeposit} onChange={() => patchSettings({ dailyOpenNeedsDeposit: !s.dailyOpenNeedsDeposit })} /></div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="section-title">Deposit bonuses</h3>
          <p className="section-sub">Percentage bonus applied on top of deposits.</p>
          <div className="form-grid">
            <NumField label="1st deposit" value={s.depositBonus1} onChange={(v) => patchSettings({ depositBonus1: v })} suffix="%" />
            <NumField label="2nd deposit" value={s.depositBonus2} onChange={(v) => patchSettings({ depositBonus2: v })} suffix="%" />
            <NumField label="3rd deposit" value={s.depositBonus3} onChange={(v) => patchSettings({ depositBonus3: v })} suffix="%" />
            <NumField label="Daily deposit" value={s.dailyDepositBonus} onChange={(v) => patchSettings({ dailyDepositBonus: v })} suffix="%" />
          </div>
          <div className="flex between mt16" style={{ gap: 12 }}>
            <div className="chip-row" style={{ flex: 1 }}>
              <button className={'chip' + (s.rebetBonus ? ' on' : '')} onClick={() => patchSettings({ rebetBonus: !s.rebetBonus })}>Rebet bonus {s.rebetBonus ? '✓' : ''}</button>
              <button className={'chip' + (s.extraBonus ? ' on' : '')} onClick={() => patchSettings({ extraBonus: !s.extraBonus })}>Extra bonus {s.extraBonus ? '✓' : ''}</button>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="section-title">Wagering requirements (Wager)</h3>
          <p className="section-sub">How many times a balance must be wagered before withdrawal.</p>
          <div className="form-grid">
            <NumField label="On bonus & rewards" value={s.bonusWager} onChange={(v) => patchSettings({ bonusWager: v })} suffix="×" />
            <NumField label="On deposit" value={s.depositWager} onChange={(v) => patchSettings({ depositWager: v })} suffix="×" />
          </div>
          <div className="card" style={{ background: 'var(--gold-soft)', boxShadow: 'none', marginTop: 16, padding: 14, borderRadius: 12, color: '#8a6400', fontSize: 13 }}>
            Bonus/reward funds require <b>{s.bonusWager}× wager</b>; deposited funds require <b>{s.depositWager}× wager</b> before cash-out.
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="section-title">Bonus summary</h3>
          <p className="section-sub">What a new player can currently receive.</p>
          {[
            ['Welcome (registration)', money(s.registrationBonus)],
            ['Daily game open', money(s.dailyOpenBonus)],
            ['1st / 2nd / 3rd deposit', `${s.depositBonus1}% / ${s.depositBonus2}% / ${s.depositBonus3}%`],
            ['Daily deposit boost', `${s.dailyDepositBonus}%`],
            ['Rebet bonus', s.rebetBonus ? 'Enabled' : 'Off'],
            ['Extra bonus', s.extraBonus ? 'Enabled' : 'Off'],
          ].map(([k, v]) => (
            <div className="field-row" key={k} style={{ padding: '12px 0' }}>
              <span className="muted">{k}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
