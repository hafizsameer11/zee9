import { useState } from 'react'
import { PageHead, Toggle, Pill, Modal } from '../components/ui'
import { Icons } from '../components/icons'
import { useAdmin } from '../data/store'
import type { Offer } from '../data/mock'

const TYPE_TONE: Record<string, string> = { Deposit: 'blue', Cashback: 'green', Festival: 'gold', Referral: 'violet' }
const TYPES: Offer['type'][] = ['Deposit', 'Cashback', 'Festival', 'Referral']

export default function Offers() {
  const { offers, updateOffer, addOffer, deleteOffer } = useAdmin()
  const [edit, setEdit] = useState<Offer | null>(null)
  const live = offers.filter((o) => o.enabled).length

  return (
    <>
      <PageHead
        title="Offers & Promotions"
        subtitle={`${live} of ${offers.length} offers live · shown in the promo banner`}
        actions={<button className="btn btn-primary" onClick={addOffer}>{Icons.plus} New offer</button>}
      />

      <div className="grid grid-2">
        {offers.map((o) => (
          <div className="card card-pad" key={o.id}>
            <div className="flex between" style={{ marginBottom: 10 }}>
              <Pill tone={TYPE_TONE[o.type]}>{o.type}</Pill>
              <Toggle on={o.enabled} onChange={() => updateOffer(o.id, { enabled: !o.enabled })} />
            </div>
            <div className="flex between" style={{ alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{o.title}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{o.desc}</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--brand)', whiteSpace: 'nowrap' }}>{o.reward}</div>
            </div>
            <div className="divider" />
            <div className="flex between">
              <span className={o.enabled ? 'pill green' : 'pill grey'}>{o.enabled ? 'Active' : 'Paused'}</span>
              <div className="flex gap8">
                <button className="btn btn-light btn-sm" onClick={() => setEdit(o)}>{Icons.edit} Edit</button>
                <button className="btn btn-outline btn-sm" onClick={() => deleteOffer(o.id)}>{Icons.x} Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {edit && (
        <Modal
          title="Edit offer"
          onClose={() => setEdit(null)}
          foot={
            <>
              <button className="btn btn-outline" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => setEdit(null)}>Save</button>
            </>
          }
        >
          <div className="fld" style={{ marginBottom: 14 }}>
            <label>Title</label>
            <input value={edit.title} onChange={(e) => { const title = e.target.value; updateOffer(edit.id, { title }); setEdit({ ...edit, title }) }} />
          </div>
          <div className="fld" style={{ marginBottom: 14 }}>
            <label>Description</label>
            <textarea value={edit.desc} rows={3} onChange={(e) => { const desc = e.target.value; updateOffer(edit.id, { desc }); setEdit({ ...edit, desc }) }} />
          </div>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <div className="fld">
              <label>Type</label>
              <select value={edit.type} onChange={(e) => { const type = e.target.value as Offer['type']; updateOffer(edit.id, { type }); setEdit({ ...edit, type }) }}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="fld">
              <label>Reward label</label>
              <input value={edit.reward} onChange={(e) => { const reward = e.target.value; updateOffer(edit.id, { reward }); setEdit({ ...edit, reward }) }} placeholder="+15%" />
            </div>
          </div>
          <div className="field-row">
            <div className="fr-info"><b>Enabled</b><span>Show in promo banner</span></div>
            <div className="fr-control">
              <Toggle on={edit.enabled} onChange={() => { updateOffer(edit.id, { enabled: !edit.enabled }); setEdit({ ...edit, enabled: !edit.enabled }) }} />
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
