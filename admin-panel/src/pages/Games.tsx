import { useState } from 'react'
import { PageHead, Pill, Toggle, Range, Modal, money, compact } from '../components/ui'
import { Icons } from '../components/icons'
import { useAdmin } from '../data/store'
import type { GameRow } from '../data/mock'

const EMOJIS = ['💎', '✈️', '🎯', '🚀', '💣', '🐂', '🎲', '🃏', '🐉', '🎴', '⚡', '🎰', '🍀', '👑', '🔥', '⭐']

export default function Games() {
  const { games, updateGame, addGame, showToast } = useAdmin()
  const [edit, setEdit] = useState<GameRow | null>(null)
  const sorted = [...games].sort((a, b) => a.order - b.order)
  const live = games.filter((g) => g.enabled).length

  return (
    <>
      <PageHead
        title="Games"
        subtitle={`${live} of ${games.length} games live · control titles, icons, win % and visibility`}
        actions={<button className="btn btn-primary" onClick={addGame}>{Icons.plus} Add game</button>}
      />

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Game</th>
                <th>Category</th>
                <th style={{ width: 240 }}>Win / Payout %</th>
                <th className="t-right">Plays</th>
                <th className="t-right">Revenue</th>
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
                    <Range value={g.winPct} min={70} max={99} onChange={(v) => updateGame(g.id, { winPct: v })} />
                  </td>
                  <td className="t-right num">{compact(g.plays)}</td>
                  <td className="t-right num cell-main">{money(g.ggr)}</td>
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
            <label>Win / Payout percentage <span className="hint">— higher means players win more</span></label>
            <Range value={edit.winPct} min={70} max={99} onChange={(v) => { updateGame(edit.id, { winPct: v }); setEdit({ ...edit, winPct: v }) }} />
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
