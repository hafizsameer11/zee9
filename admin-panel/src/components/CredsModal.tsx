import { Modal } from './ui'
import type { AgentCreds } from '../data/store'

export function CredsModal({ creds, onClose }: { creds: AgentCreds; onClose: () => void }) {
  const copy = (t: string) => navigator.clipboard?.writeText(t)
  const rows: [string, string][] = [
    ['Phone (login)', creds.phone],
    ['Password', creds.password],
    ['Referral code', creds.referralCode],
  ]
  return (
    <Modal title="Agent login generated" onClose={onClose} foot={<button className="btn btn-primary" onClick={onClose}>Done</button>}>
      <div className="card" style={{ background: 'var(--amber-soft)', boxShadow: 'none', padding: 12, borderRadius: 10, color: '#8a6400', fontSize: 12.5, marginBottom: 16 }}>
        ⚠️ Share these with the agent for the C2C panel. The password is shown <b>only once</b>.
      </div>
      {rows.map(([k, v]) => (
        <div className="field-row" key={k}>
          <div className="fr-info">
            <span className="muted" style={{ fontSize: 12 }}>{k}</span>
            <b style={{ fontSize: 16, fontFamily: 'monospace' }}>{v}</b>
          </div>
          <button className="btn btn-light btn-sm" onClick={() => copy(v)}>Copy</button>
        </div>
      ))}
    </Modal>
  )
}
