import { PageHead, Toggle, money } from '../components/ui'
import { useAdmin } from '../data/store'
import { DEFAULT_FREE_CASH, type FreeCashConfig, type FreeCashQuest } from '../data/freeCash'

export default function FreeCash() {
  const { settings, patchSettings } = useAdmin()
  const fc: FreeCashConfig = settings.freeCash
    ? {
        ...DEFAULT_FREE_CASH,
        ...settings.freeCash,
        quests: Array.isArray(settings.freeCash.quests) && settings.freeCash.quests.length
          ? settings.freeCash.quests
          : DEFAULT_FREE_CASH.quests.map((q) => ({ ...q })),
      }
    : { ...DEFAULT_FREE_CASH, quests: DEFAULT_FREE_CASH.quests.map((q) => ({ ...q })) }

  const save = (next: FreeCashConfig) => patchSettings({ freeCash: next })

  const updateQuest = (i: number, patch: Partial<FreeCashQuest>) => {
    const quests = fc.quests.map((q, idx) => (idx === i ? { ...q, ...patch } : q))
    save({ ...fc, quests })
  }

  return (
    <div>
      <PageHead
        title="Free Cash / Quests"
        subtitle="Daily quests — play / bet / win / deposit targets and rewards (game Free Cash screen)"
        actions={
          <button className="btn btn-primary" type="button" onClick={() => save(fc)}>
            Save Free Cash
          </button>
        }
      />

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="field-row">
          <div className="fr-info">
            <b>Enabled</b>
            <span>Show Free Cash quests in the game bottom bar</span>
          </div>
          <div className="fr-control">
            <Toggle on={fc.enabled} onChange={() => save({ ...fc, enabled: !fc.enabled })} />
          </div>
        </div>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="fld">
            <label>Max daily free rewards</label>
            <div className="inp-group">
              <span className="addon">Rs </span>
              <input
                type="number"
                value={fc.maxDailyReward}
                onChange={(e) => save({ ...fc, maxDailyReward: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="fld">
            <label>Daily reset hour (0–23)</label>
            <div className="inp-group">
              <span className="addon">h </span>
              <input
                type="number"
                min={0}
                max={23}
                value={fc.resetHour}
                onChange={(e) => save({ ...fc, resetHour: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          Default max {money(2200)} · reset 05:00 — matches Free Cash header on game.
        </p>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 className="section-title">Welcome-back (1 week return)</h3>
        <p className="section-sub">Separate popup when inactive — also editable under Bonuses.</p>
        <div className="field-row">
          <div className="fr-info"><b>Enabled</b></div>
          <div className="fr-control">
            <Toggle
              on={settings.returnBonusEnabled !== false}
              onChange={() =>
                patchSettings({ returnBonusEnabled: settings.returnBonusEnabled === false })
              }
            />
          </div>
        </div>
        <div className="form-grid">
          <div className="fld">
            <label>Inactive days</label>
            <input
              type="number"
              value={settings.returnBonusInactiveDays ?? 7}
              onChange={(e) => patchSettings({ returnBonusInactiveDays: Number(e.target.value) })}
            />
          </div>
          <div className="fld">
            <label>Min Rs</label>
            <input
              type="number"
              value={settings.returnBonusMin ?? 40}
              onChange={(e) => patchSettings({ returnBonusMin: Number(e.target.value) })}
            />
          </div>
          <div className="fld">
            <label>Max Rs</label>
            <input
              type="number"
              value={settings.returnBonusMax ?? 200}
              onChange={(e) => patchSettings({ returnBonusMax: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="flex between" style={{ marginBottom: 12 }}>
          <h3 className="section-title" style={{ margin: 0 }}>Quest list</h3>
          <button
            className="btn btn-outline"
            type="button"
            onClick={() =>
              save({
                ...fc,
                quests: [
                  ...fc.quests,
                  {
                    id: `q-${Date.now()}`,
                    kind: 'PLAY_ROUNDS',
                    title: 'New quest',
                    desc: 'Complete the target',
                    target: 10,
                    reward: 10,
                    tier: 1,
                    maxTier: 5,
                    enabled: true,
                    period: 'daily',
                  },
                ],
              })
            }
          >
            Add quest
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>On</th>
                <th>Title</th>
                <th>Kind</th>
                <th>Target</th>
                <th>Reward</th>
                <th>Tier</th>
                <th>Period</th>
                <th>Desc</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {fc.quests.map((q, i) => (
                <tr key={q.id}>
                  <td>
                    <Toggle on={q.enabled} onChange={() => updateQuest(i, { enabled: !q.enabled })} />
                  </td>
                  <td>
                    <input value={q.title} onChange={(e) => updateQuest(i, { title: e.target.value })} style={{ minWidth: 110 }} />
                  </td>
                  <td>
                    <select
                      value={q.kind}
                      onChange={(e) => updateQuest(i, { kind: e.target.value as FreeCashQuest['kind'] })}
                    >
                      <option value="PLAY_ROUNDS">Play rounds</option>
                      <option value="BET_TOTAL">Bet total</option>
                      <option value="WIN_TOTAL">Win total</option>
                      <option value="DEPOSIT_COUNT">Deposits</option>
                      <option value="RETURN">Return (1wk)</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={q.target}
                      onChange={(e) => updateQuest(i, { target: Number(e.target.value) })}
                      style={{ width: 80 }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={q.reward}
                      onChange={(e) => updateQuest(i, { reward: Number(e.target.value) })}
                      style={{ width: 70 }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={q.tier}
                      onChange={(e) => updateQuest(i, { tier: Number(e.target.value) })}
                      style={{ width: 44 }}
                    />
                    /
                    <input
                      type="number"
                      value={q.maxTier}
                      onChange={(e) => updateQuest(i, { maxTier: Number(e.target.value) })}
                      style={{ width: 44 }}
                    />
                  </td>
                  <td>
                    <select
                      value={q.period}
                      onChange={(e) => updateQuest(i, { period: e.target.value as 'daily' | 'weekly' })}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </td>
                  <td>
                    <input
                      value={q.desc}
                      onChange={(e) => updateQuest(i, { desc: e.target.value })}
                      style={{ minWidth: 160 }}
                    />
                  </td>
                  <td>
                    <button
                      className="btn btn-outline btn-icon"
                      type="button"
                      onClick={() => save({ ...fc, quests: fc.quests.filter((_, idx) => idx !== i) })}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          className="btn"
          type="button"
          style={{ marginTop: 12 }}
          onClick={() =>
            save({
              ...DEFAULT_FREE_CASH,
              quests: DEFAULT_FREE_CASH.quests.map((q) => ({ ...q })),
            })
          }
        >
          Reset quest defaults
        </button>
      </div>
    </div>
  )
}
