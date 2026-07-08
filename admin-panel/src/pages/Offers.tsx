import { PageHead, Toggle, Pill } from '../components/ui'
import { Icons } from '../components/icons'
import { useAdmin } from '../data/store'

const TYPE_TONE: Record<string, string> = { Deposit: 'blue', Cashback: 'green', Festival: 'gold', Referral: 'violet' }

export default function Offers() {
  const { offers, updateOffer } = useAdmin()
  const live = offers.filter((o) => o.enabled).length

  return (
    <>
      <PageHead
        title="Offers & Promotions"
        subtitle={`${live} of ${offers.length} offers live · shown in the promo banner`}
        actions={<button className="btn btn-primary">{Icons.plus} New offer</button>}
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
              <button className="btn btn-light btn-sm">{Icons.edit} Edit</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
