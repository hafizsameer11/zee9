import { PageHead, Toggle } from '../components/ui'
import { Icons } from '../components/icons'
import { useAdmin } from '../data/store'

export default function Settings() {
  const { settings, patchSettings, reset } = useAdmin()
  const s = settings

  return (
    <>
      <PageHead
        title="Settings"
        subtitle="Platform identity, customer service and links"
        actions={
          <>
            <button className="btn btn-outline" onClick={reset}>Reset to defaults</button>
            <button className="btn btn-primary" onClick={() => patchSettings({})}>Save</button>
          </>
        }
      />

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="section-title">Platform</h3>
          <p className="section-sub">Branding shown across the app.</p>
          <div className="form-grid">
            <div className="fld">
              <label>Platform name</label>
              <input value={s.platformName} onChange={(e) => patchSettings({ platformName: e.target.value })} />
            </div>
            <div className="fld">
              <label>Currency</label>
              <select value={s.currency} onChange={(e) => patchSettings({ currency: e.target.value })}>
                <option>PKR</option>
                <option>INR</option>
                <option>USD</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="section-title">Customer service</h3>
          <p className="section-sub">Direct WhatsApp support for players.</p>
          <div className="fld" style={{ marginBottom: 14 }}>
            <label>WhatsApp number</label>
            <div className="inp-group">
              <span className="addon" style={{ color: 'var(--green)' }}>{Icons.wa}</span>
              <input value={s.whatsapp} onChange={(e) => patchSettings({ whatsapp: e.target.value })} />
            </div>
          </div>
          <div className="field-row">
            <div className="fr-info"><b>Open CS directly on WhatsApp</b><span>Tapping support launches WhatsApp chat</span></div>
            <div className="fr-control"><Toggle on={s.whatsappEnabled} onChange={() => patchSettings({ whatsappEnabled: !s.whatsappEnabled })} /></div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="section-title">Lobby ticker headline</h3>
          <p className="section-sub">The scrolling headline shown at the top of the player lobby.</p>
          <div className="fld">
            <label>Ticker text</label>
            <textarea
              rows={3}
              value={s.tickerText}
              onChange={(e) => patchSettings({ tickerText: e.target.value })}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="section-title">Links</h3>
          <p className="section-sub">Share link doubles as the panel-activation link — the panel activates from the same link without opening a game.</p>
          <div className="fld" style={{ marginBottom: 14 }}>
            <label>Share / referral link</label>
            <input value={s.shareLink} onChange={(e) => patchSettings({ shareLink: e.target.value })} />
          </div>
          <div className="fld">
            <label>Panel link <span className="hint">— activates panel from the same link</span></label>
            <input value={s.panelLink} onChange={(e) => patchSettings({ panelLink: e.target.value })} />
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="section-title">Lucky wheel</h3>
          <p className="section-sub">How much deposit earns one wheel spin ticket.</p>
          <div className="fld">
            <label>Deposit per spin (Rs)</label>
            <input
              type="number"
              min={0}
              value={s.wheelDepositPerSpin ?? 1000}
              onChange={(e) => patchSettings({ wheelDepositPerSpin: Math.max(0, Number(e.target.value)) })}
            />
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="section-title">In-game UI placement</h3>
          <p className="section-sub">Where helper widgets appear on the game screen.</p>
          <div className="field-row">
            <div className="fr-info"><b>Wheel & cashback cards</b><span>Shown on the lower-top of the game</span></div>
            <div className="fr-control"><Toggle on={s.wheelsLowerTop} onChange={() => patchSettings({ wheelsLowerTop: !s.wheelsLowerTop })} /></div>
          </div>
          <div className="field-row">
            <div className="fr-info"><b>Settings & CS buttons</b><span>Shown on the upper-right of the game</span></div>
            <div className="fr-control"><Toggle on={s.csUpperRight} onChange={() => patchSettings({ csUpperRight: !s.csUpperRight })} /></div>
          </div>
        </div>
      </div>
    </>
  )
}
