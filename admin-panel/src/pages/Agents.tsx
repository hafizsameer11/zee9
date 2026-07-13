import { useEffect, useState } from 'react'
import { PageHead, Pill, Toggle, Avatar, Wallets, StatCard, Modal, money } from '../components/ui'
import { Icons } from '../components/icons'
import { useAdmin } from '../data/store'
import type { AgentCreds } from '../data/store'
import { CredsModal } from '../components/CredsModal'

const METHOD_LABEL: Record<string, string> = { JAZZCASH: 'Jazzcash', EASYPAISA: 'Easypaisa', BANK: 'Bank' }

export default function Agents() {
  const { agents, agentAccounts, updateAgent, createAgent, approveAgentAccount, rejectAgentAccount, payoutAgentCommission, settings, showToast } = useAdmin()
  const [showCreate, setShowCreate] = useState(false)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [creds, setCreds] = useState<AgentCreds | null>(null)

  const active = agents.filter((a) => a.active).length
  const totalCommission = agents.reduce((s, a) => s + a.commission, 0)
  const totalRefs = agents.reduce((s, a) => s + a.referrals, 0)
  const pendingBalance = agents.reduce((s, a) => s + a.commissionBalance, 0)

  async function submitCreate() {
    if (phone.trim().length < 7 || name.trim().length < 2) {
      showToast('Enter a valid phone and name')
      return
    }
    setBusy(true)
    try {
      const c = await createAgent(phone.trim(), name.trim())
      setShowCreate(false)
      setPhone('')
      setName('')
      setCreds(c)
    } catch (e: any) {
      showToast(e?.message || 'Failed to create agent')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHead
        title="Agents"
        subtitle={`Agentship activates after ${settings.walletsRequired} wallets · min ${money(settings.minPerWallet)} deposit each`}
        actions={<button className="btn btn-primary" onClick={() => setShowCreate(true)}>{Icons.plus} Create agent</button>}
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard icon="agents" tone="violet" value={`${active}/${agents.length}`} label="Active agents" />
        <StatCard icon="referrals" tone="green" value={String(totalRefs)} label="Total referrals" />
        <StatCard icon="money" tone="gold" value={money(totalCommission)} label="Commission earned" />
      </div>

      {agentAccounts.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-pad">
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Payment accounts awaiting review</h3>
            <p className="section-sub" style={{ marginBottom: 14 }}>{agentAccounts.length} agent account(s) need approval before they can collect deposits.</p>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Method</th>
                  <th>Account</th>
                  <th>Holder</th>
                  <th>Submitted</th>
                  <th className="t-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agentAccounts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="cell-main">{a.agentName}</div>
                      <div className="cell-sub">{a.agentPhone}</div>
                    </td>
                    <td><Pill tone="blue">{METHOD_LABEL[a.method] ?? a.method}</Pill></td>
                    <td className="num">{a.number}</td>
                    <td>{a.holder}</td>
                    <td className="muted">{a.createdAt}</td>
                    <td className="t-right">
                      <div className="flex gap8" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => approveAgentAccount(a.id)}>Approve</button>
                        <button className="btn btn-outline btn-sm" onClick={() => rejectAgentAccount(a.id)}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pendingBalance > 0 && (
        <div className="card card-pad" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800 }}>Unpaid commission balance</div>
            <div className="muted" style={{ fontSize: 13 }}>Agents have {money(pendingBalance)} in COMMISSION buckets ready to pay out.</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Level</th>
                <th style={{ width: 130 }}>Wallets</th>
                <th className="t-right">Referrals</th>
                <th className="t-right">Commission</th>
                <th className="t-right">Unpaid</th>
                <th>Joined</th>
                <th>Active</th>
                <th className="t-right">Payout</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => {
                const ready = a.walletsFilled >= settings.walletsRequired
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="cell-media">
                        <Avatar name={a.name} />
                        <div>
                          <div className="cell-main">{a.name}</div>
                          <div className="cell-sub">{a.id} · {a.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Pill tone={a.level === 1 ? 'violet' : a.level === 2 ? 'blue' : 'grey'}>Level {a.level}</Pill>
                    </td>
                    <td>
                      <div className="flex gap8">
                        <Wallets filled={a.walletsFilled} total={settings.walletsRequired} />
                        <span className="muted" style={{ fontSize: 12 }}>{a.walletsFilled}/{settings.walletsRequired}</span>
                      </div>
                      {!ready && <div className="cell-sub red-t">Not eligible</div>}
                    </td>
                    <td className="t-right num">{a.referrals}</td>
                    <td className="t-right num cell-main gold-t">{money(a.commission)}</td>
                    <td className="t-right num">{money(a.commissionBalance)}</td>
                    <td className="muted">{a.joined}</td>
                    <td>
                      <div className="flex gap8">
                        <Toggle on={a.active} onChange={() => updateAgent(a.id, { active: !a.active })} />
                        {a.active ? <Pill tone="green">On</Pill> : <Pill tone="grey">Off</Pill>}
                      </div>
                    </td>
                    <td className="t-right">
                      {a.commissionBalance > 0 ? (
                        <button className="btn btn-light btn-sm" onClick={() => payoutAgentCommission(a.id)}>Pay out</button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <Modal
          title="Create agent login"
          onClose={() => setShowCreate(false)}
          foot={
            <>
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitCreate} disabled={busy}>{busy ? 'Creating…' : 'Generate login'}</button>
            </>
          }
        >
          <p className="section-sub">Creates a C2C panel account for a user who reached agent rank. A password is generated automatically.</p>
          <div className="fld" style={{ marginBottom: 14 }}>
            <label>Agent name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Adnan Ali" />
          </div>
          <div className="fld">
            <label>Phone (login)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03001234567" />
          </div>
        </Modal>
      )}

      {creds && <CredsModal creds={creds} onClose={() => setCreds(null)} />}
    </>
  )
}
