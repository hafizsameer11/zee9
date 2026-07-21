import { useState } from 'react'
import { PageHead, Pill, Toggle, Range, Modal, money, compact } from '../components/ui'
import { Icons } from '../components/icons'
import { useAdmin } from '../data/store'
import type { GameRow } from '../data/mock'

const EMOJIS = ['💎', '✈️', '🎯', '🚀', '💣', '🐂', '🎲', '🃏', '🐉', '🎴', '⚡', '🎰', '🍀', '👑', '🔥', '⭐']

function profitTone(n: number) {
  if (n > 0) return { color: '#0f7a3a' }
  if (n < 0) return { color: '#c62828' }
  return { color: 'inherit' }
}

export default function Games() {
  const { games, updateGame, addGame, showToast } = useAdmin()
  const [edit, setEdit] = useState<GameRow | null>(null)
  const sorted = [...games].sort((a, b) => a.order - b.order)
  const live = games.filter((g) => g.enabled).length

  const totals = games.reduce(
    (acc, g) => {
      acc.plays += g.plays
      acc.wagered += g.wagered
      acc.won += g.playerWonAmount
      acc.lost += g.playerLostAmount
      acc.profit += g.houseProfit
      return acc
    },
    { plays: 0, wagered: 0, won: 0, lost: 0, profit: 0 },
  )

  return (
    <>
      <PageHead
        title="Games"
        subtitle={`${live} of ${games.length} games live · win % 0–100 · live plays / P&L from real rounds`}
        actions={<button className="btn btn-primary" onClick={addGame}>{Icons.plus} Add game</button>}
      />

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="card card-pad">
          <div className="stat-label">Total plays</div>
          <div className="stat-val">{compact(totals.plays)}</div>
        </div>
        <div className="card card-pad">
          <div className="stat-label">Total wagered</div>
          <div className="stat-val">{money(totals.wagered)}</div>
        </div>
        <div className="card card-pad">
          <div className="stat-label">Player wins (paid)</div>
          <div className="stat-val" style={{ color: '#c62828' }}>{money(totals.won)}</div>
        </div>
        <div className="card card-pad">
          <div className="stat-label">Player losses</div>
          <div className="stat-val" style={{ color: '#0f7a3a' }}>{money(totals.lost)}</div>
        </div>
        <div className="card card-pad">
          <div className="stat-label">House profit / loss</div>
          <div className="stat-val" style={profitTone(totals.profit)}>{money(totals.profit)}</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Game</th>
                <th>Category</th>
                <th style={{ width: 220 }}>Win / Payout %</th>
                <th className="t-right">Plays</th>
                <th className="t-right">Wagered</th>
                <th className="t-right">User wins</th>
                <th className="t-right">User losses</th>
                <th className="t-right">House P/L</th>
                <th>Status</th>
                <th className="t-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((g) => (
                <tr key={g.id}>
                  <td>
                    <div className="cell-media">
                      <span className="gtile" style={{ background: g.color + '22', color: g.color }}>
                        {g.emoji}
                      </span>
                      <div>
                        <div className="cell-main flex gap8">
                          {g.title}
                          {g.tag && <span className={'tag ' + g.tag}>{g.tag.toUpperCase()}</span>}
                        </div>
                        <div className="cell-sub">#{g.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Pill tone="grey">{g.category}</Pill>
                  </td>
                  <td>
                    <Range value={g.winPct} min={0} max={100} onChange={(v) => updateGame(g.id, { winPct: v })} />
                  </td>
                  <td className="t-right num">{compact(g.plays)}</td>
                  <td className="t-right num">{money(g.wagered)}</td>
                  <td className="t-right num">
                    <div className="cell-main">{compact(g.playerWins)}</div>
                    <div className="cell-sub" style={{ color: '#c62828' }}>{money(g.playerWonAmount)}</div>
                  </td>
                  <td className="t-right num">
                    <div className="cell-main">{compact(g.playerLosses)}</div>
                    <div className="cell-sub" style={{ color: '#0f7a3a' }}>{money(g.playerLostAmount)}</div>
                  </td>
                  <td className="t-right num cell-main" style={profitTone(g.houseProfit)}>
                    {money(g.houseProfit)}
                  </td>
                  <td>
                    {g.enabled ? <Pill tone="green">Live</Pill> : <Pill tone="grey">Off</Pill>}
                  </td>
                  <td className="t-right">
                    <div className="flex gap8" style={{ justifyContent: 'flex-end' }}>
                      <Toggle on={g.enabled} onChange={() => updateGame(g.id, { enabled: !g.enabled })} />
                      <button className="btn btn-light btn-icon" onClick={() => setEdit(g)}>
                        {Icons.edit}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <Modal
          title="Edit game"
          onClose={() => setEdit(null)}
          foot={
            <>
              <button className="btn btn-outline" onClick={() => setEdit(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEdit(null)
                  showToast('Game updated')
                }}
              >
                Save changes
              </button>
            </>
          }
        >
          <div className="flex gap16" style={{ marginBottom: 20 }}>
            <span className="gtile" style={{ width: 64, height: 64, fontSize: 34, background: edit.color + '22', color: edit.color }}>
              {edit.emoji}
            </span>
            <div style={{ flex: 1 }}>
              <div className="fld">
                <label>Title</label>
                <input value={edit.title} onChange={(e) => { updateGame(edit.id, { title: e.target.value }); setEdit({ ...edit, title: e.target.value }) }} />
              </div>
            </div>
          </div>

          <div className="fld" style={{ marginBottom: 16 }}>
            <label>Icon</label>
            <div className="chip-row">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  className={'chip' + (edit.emoji === e ? ' on' : '')}
                  style={{ fontSize: 18 }}
                  onClick={() => { updateGame(edit.id, { emoji: e }); setEdit({ ...edit, emoji: e }) }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div className="fld">
              <label>Category</label>
              <select value={edit.category} onChange={(e) => { updateGame(edit.id, { category: e.target.value as GameRow['category'] }); setEdit({ ...edit, category: e.target.value as GameRow['category'] }) }}>
                {['Slots', 'Crash', 'Lottery', 'Table', 'Mini'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="fld">
              <label>Badge</label>
              <select value={edit.tag ?? ''} onChange={(e) => { const t = (e.target.value || undefined) as GameRow['tag']; updateGame(edit.id, { tag: t }); setEdit({ ...edit, tag: t }) }}>
                <option value="">None</option>
                <option value="hot">Hot</option>
                <option value="new">New</option>
              </select>
            </div>
          </div>

          <div className="fld">
            <label>Win / Payout percentage <span className="hint">— house edge: 0% = players almost always hit mines · 100% = fair odds · multipliers stay normal</span></label>
            <Range value={edit.winPct} min={0} max={100} onChange={(v) => { updateGame(edit.id, { winPct: v }); setEdit({ ...edit, winPct: v }) }} />
          </div>

          <div className="form-grid mt16" style={{ fontSize: 13 }}>
            <div><b>Plays</b><div>{edit.plays}</div></div>
            <div><b>Wagered</b><div>{money(edit.wagered)}</div></div>
            <div><b>User wins</b><div>{edit.playerWins} · {money(edit.playerWonAmount)}</div></div>
            <div><b>User losses</b><div>{edit.playerLosses} · {money(edit.playerLostAmount)}</div></div>
            <div><b>House P/L</b><div style={profitTone(edit.houseProfit)}>{money(edit.houseProfit)}</div></div>
          </div>

          <div className="field-row mt16">
            <div className="fr-info">
              <b>Game enabled</b>
              <span>Show this game in the lobby</span>
            </div>
            <div className="fr-control">
              <Toggle on={edit.enabled} onChange={() => { updateGame(edit.id, { enabled: !edit.enabled }); setEdit({ ...edit, enabled: !edit.enabled }) }} />
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
