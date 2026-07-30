import { PageHead, money } from '../components/ui'
import { useAdmin } from '../data/store'
import { DEFAULT_VIP_LEVELS, type VipLevelRow } from '../data/vip'

function cell(
  levels: VipLevelRow[],
  i: number,
  key: keyof VipLevelRow,
  onChange: (next: VipLevelRow[]) => void,
  step = 1,
) {
  const v = levels[i]![key]
  return (
    <input
      type="number"
      step={step}
      value={Number(v)}
      style={{ width: '100%', minWidth: 64 }}
      onChange={(e) => {
        const next = levels.map((row, idx) =>
          idx === i ? { ...row, [key]: Number(e.target.value) } : row,
        )
        onChange(next)
      }}
    />
  )
}

export default function Vip() {
  const { settings, patchSettings } = useAdmin()
  const levels: VipLevelRow[] =
    Array.isArray(settings.vipLevels) && settings.vipLevels.length >= 2
      ? settings.vipLevels.map((r, i) => ({ ...DEFAULT_VIP_LEVELS[i]!, ...r, level: i }))
      : DEFAULT_VIP_LEVELS.map((l) => ({ ...l }))

  const save = (next: VipLevelRow[]) => {
    patchSettings({ vipLevels: next })
  }

  return (
    <div>
      <PageHead
        title="VIP Salary"
        subtitle="V0–V12 thresholds, level-up / weekly / monthly rewards — edits apply immediately"
        actions={<button className="btn btn-primary" onClick={() => patchSettings({ vipLevels: levels })}>Save VIP table</button>}
      />

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <p className="section-sub" style={{ marginBottom: 8 }}>
          VIP level = total approved deposits. Weekly resets every 7 days, monthly every 30 days after claim.
          Level-up reward can be claimed once per level.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>V</th>
                <th>Deposit need (Rs)</th>
                <th>Bet rebate %</th>
                <th>Level-up Rs</th>
                <th>Weekly Rs</th>
                <th>Monthly Rs</th>
                <th>Invite min %</th>
                <th>Invite max %</th>
                <th>Perk text</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((row, i) => (
                <tr key={i}>
                  <td><b>V{i}</b></td>
                  <td>{cell(levels, i, 'threshold', save)}</td>
                  <td>{cell(levels, i, 'betRebate', save, 0.1)}</td>
                  <td>{cell(levels, i, 'levelUpReward', save)}</td>
                  <td>{cell(levels, i, 'weeklySalary', save)}</td>
                  <td>{cell(levels, i, 'monthlySalary', save)}</td>
                  <td>{cell(levels, i, 'inviteMin', save, 0.1)}</td>
                  <td>{cell(levels, i, 'inviteMax', save, 0.1)}</td>
                  <td>
                    <input
                      type="text"
                      value={row.perk}
                      style={{ minWidth: 180, width: '100%' }}
                      onChange={(e) => {
                        const next = levels.map((r, idx) =>
                          idx === i ? { ...r, perk: e.target.value } : r,
                        )
                        save(next)
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt16" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn"
            type="button"
            onClick={() => save(DEFAULT_VIP_LEVELS.map((l) => ({ ...l })))}
          >
            Reset defaults
          </button>
          <span className="hint">
            Example V5: deposit {money(levels[5]?.threshold ?? 100000)} · weekly {money(levels[5]?.weeklySalary ?? 20)} · monthly {money(levels[5]?.monthlySalary ?? 50)}
          </span>
        </div>
      </div>
    </div>
  )
}
