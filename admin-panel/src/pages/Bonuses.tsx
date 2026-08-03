import { useState } from 'react'
import { PageHead, Toggle, money } from '../components/ui'
import { useAdmin } from '../data/store'
import { api } from '../api/client'

function NumField({ label, value, onChange, suffix = 'Rs ', hint }: { label: string; value: number; onChange: (v: number) => void; suffix?: string; hint?: string }) {
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

type PlayerWager = {
  id: string
  displayName: string
  phone: string
  playerNo: number
  status: string
  depositWagerOverride: number | null
  bonusWagerOverride: number | null
  wager: {
    depositWager: number
    bonusWager: number
    depositOverride: number | null
    bonusOverride: number | null
    globalDepositWager: number
    globalBonusWager: number
  }
}

export default function Bonuses() {
  const { settings, patchSettings, showToast } = useAdmin()
  const s = settings

  const [gameId, setGameId] = useState('')
  const [player, setPlayer] = useState<PlayerWager | null>(null)
  const [depositX, setDepositX] = useState('')
  const [bonusX, setBonusX] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function searchPlayer() {
    const n = Number(String(gameId).trim())
    if (!Number.isFinite(n) || n <= 0) {
      setErr('Enter a valid Game ID')
      setPlayer(null)
      return
    }
    setBusy(true)
    setErr('')
    try {
      const data = await api.get(`/admin/users/by-game-id/${n}`)
      setPlayer(data)
      setDepositX(data.depositWagerOverride != null ? String(data.depositWagerOverride) : '')
      setBonusX(data.bonusWagerOverride != null ? String(data.bonusWagerOverride) : '')
    } catch (e: any) {
      setPlayer(null)
      setErr(e?.message || 'Player not found')
    } finally {
      setBusy(false)
    }
  }

  async function savePlayerWager() {
    if (!player) return
    setBusy(true)
    setErr('')
    try {
      const body: { depositWager: number | null; bonusWager: number | null } = {
        depositWager: depositX.trim() === '' ? null : Number(depositX),
        bonusWager: bonusX.trim() === '' ? null : Number(bonusX),
      }
      if (body.depositWager != null && (!Number.isFinite(body.depositWager) || body.depositWager < 0)) {
        throw new Error('Deposit wager must be 0 or more')
      }
      if (body.bonusWager != null && (!Number.isFinite(body.bonusWager) || body.bonusWager < 0)) {
        throw new Error('Bonus wager must be 0 or more')
      }
      const data = await api.patch(`/admin/users/${player.id}/wager-overrides`, body)
      setPlayer(data)
      setDepositX(data.depositWagerOverride != null ? String(data.depositWagerOverride) : '')
      setBonusX(data.bonusWagerOverride != null ? String(data.bonusWagerOverride) : '')
      showToast('Player wager saved')
    } catch (e: any) {
      setErr(e?.message || 'Could not save wager')
    } finally {
      setBusy(false)
    }
  }

  async function clearPlayerWager() {
    if (!player) return
    setBusy(true)
    setErr('')
    try {
      const data = await api.patch(`/admin/users/${player.id}/wager-overrides`, {
        depositWager: null,
        bonusWager: null,
      })
      setPlayer(data)
      setDepositX('')
      setBonusX('')
      showToast('Cleared — using global wager')
    } catch (e: any) {
      setErr(e?.message || 'Could not clear')
    } finally {
      setBusy(false)
    }
  }

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
          </div>
          <h4 className="section-title" style={{ marginTop: 16, fontSize: 14 }}>Daily rewards (Day 1–7)</h4>
          <p className="section-sub">Consecutive login. Miss a day and the streak resets.</p>
          <div className="form-grid">
            {(s.dailyRewards?.length === 7 ? s.dailyRewards : [4, 9, 3, 5, 8, 6, 10]).map((amt, i) => (
              <NumField
                key={i}
                label={`Day ${i + 1}`}
                value={amt}
                onChange={(v) => {
                  const next = [...(s.dailyRewards?.length === 7 ? s.dailyRewards : [4, 9, 3, 5, 8, 6, 10])]
                  next[i] = v
                  patchSettings({ dailyRewards: next, dailyOpenBonus: next[0] })
                }}
              />
            ))}
          </div>
          <div className="field-row mt16">
            <div className="fr-info">
              <b>Bonus withdrawal needs a deposit</b>
              <span>Player must deposit once before withdrawing the daily open bonus</span>
            </div>
            <div className="fr-control"><Toggle on={s.dailyOpenNeedsDeposit} onChange={() => patchSettings({ dailyOpenNeedsDeposit: !s.dailyOpenNeedsDeposit })} /></div>
          </div>
          <h4 className="section-title" style={{ marginTop: 20, fontSize: 14 }}>Welcome-back (return) bonus</h4>
          <p className="section-sub">If a player stops playing for N days then returns, they can claim a random bonus in this range.</p>
          <div className="field-row mt8">
            <div className="fr-info">
              <b>Enabled</b>
              <span>Show return popup in game lobby when eligible</span>
            </div>
            <div className="fr-control">
              <Toggle
                on={s.returnBonusEnabled !== false}
                onChange={() => patchSettings({ returnBonusEnabled: s.returnBonusEnabled === false })}
              />
            </div>
          </div>
          <div className="form-grid">
            <NumField
              label="Inactive days"
              value={s.returnBonusInactiveDays ?? 7}
              onChange={(v) => patchSettings({ returnBonusInactiveDays: v })}
              suffix="days"
              hint="no game bets"
            />
            <NumField
              label="Min bonus"
              value={s.returnBonusMin ?? 40}
              onChange={(v) => patchSettings({ returnBonusMin: v })}
            />
            <NumField
              label="Max bonus"
              value={s.returnBonusMax ?? 200}
              onChange={(v) => patchSettings({ returnBonusMax: v })}
            />
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="section-title">Deposit bonuses</h3>
          <p className="section-sub">Every approved deposit gets this % bonus — each time, no daily limit.</p>
          <div className="form-grid">
            <NumField
              label="Every deposit"
              value={s.dailyDepositBonus}
              onChange={(v) => patchSettings({ dailyDepositBonus: v })}
              suffix="%"
            />
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
            ['Daily rewards (7 days)', (s.dailyRewards?.length === 7 ? s.dailyRewards : [4, 9, 3, 5, 8, 6, 10]).map((n) => `Rs ${n}`).join(' / ')],
            ['Every deposit bonus', `${s.dailyDepositBonus}%`],
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

      <div className="card card-pad" style={{ marginTop: 24 }}>
        <h3 className="section-title">Extra — per Game ID wager</h3>
        <p className="section-sub">
          Search a Game ID and set custom deposit / bonus wager for that player only. Leave blank to use global ({s.depositWager}× / {s.bonusWager}×).
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginTop: 12 }}>
          <div className="fld" style={{ margin: 0, minWidth: 180 }}>
            <label>Game ID</label>
            <input
              type="number"
              placeholder="e.g. 8088187"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void searchPlayer()
              }}
            />
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={() => void searchPlayer()}>
            {busy ? 'Searching…' : 'Search'}
          </button>
        </div>

        {err && (
          <div style={{ marginTop: 12, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{err}</div>
        )}

        {player && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line, #e8e8f0)' }}>
            <div style={{ marginBottom: 14 }}>
              <b>Game ID {player.playerNo}</b>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                {player.displayName} · {player.phone} · {player.status}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Effective now: deposit <b>{player.wager.depositWager}×</b>
                {player.wager.depositOverride != null ? ' (custom)' : ' (global)'}
                {' · '}
                bonus <b>{player.wager.bonusWager}×</b>
                {player.wager.bonusOverride != null ? ' (custom)' : ' (global)'}
              </div>
            </div>

            <div className="form-grid">
              <div className="fld">
                <label>Deposit wager (×) — blank = global {s.depositWager}×</label>
                <div className="inp-group">
                  <span className="addon">×</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder={String(s.depositWager)}
                    value={depositX}
                    onChange={(e) => setDepositX(e.target.value)}
                  />
                </div>
              </div>
              <div className="fld">
                <label>Bonus wager (×) — blank = global {s.bonusWager}×</label>
                <div className="inp-group">
                  <span className="addon">×</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder={String(s.bonusWager)}
                    value={bonusX}
                    onChange={(e) => setBonusX(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap8" style={{ marginTop: 14, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" disabled={busy} onClick={() => void savePlayerWager()}>
                Save player wager
              </button>
              <button className="btn btn-ghost" disabled={busy} onClick={() => void clearPlayerWager()}>
                Clear to global
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
