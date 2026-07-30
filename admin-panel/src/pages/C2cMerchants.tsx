import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead, Pill, Toggle, Avatar, Wallets, StatCard, Modal, money } from '../components/ui'
import { Icons } from '../components/icons'
import { useAdmin } from '../data/store'
import type { AgentCreds } from '../data/store'
import { CredsModal } from '../components/CredsModal'

const METHOD_LABEL: Record<string, string> = { JAZZCASH: 'Jazzcash', EASYPAISA: 'Easypaisa', BANK: 'Bank' }

export default function C2cMerchants() {
  const {
    agents, agentAccounts, updateAgent, createAgent, approveAgentAccount, rejectAgentAccount,
    addAgentAccount, adjustAgentFloat, payoutAgentCommission, settings, showToast,
  } = useAdmin()
  const [showCreate, setShowCreate] = useState(false)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [creds, setCreds] = useState<AgentCreds | null>(null)

  const [acctAgent, setAcctAgent] = useState<{ id: string; name: string } | null>(null)
  const [acctMethod, setAcctMethod] = useState('JAZZCASH')
  const [acctNumber, setAcctNumber] = useState('')
  const [acctHolder, setAcctHolder] = useState('')

  const [floatAgent, setFloatAgent] = useState<{ id: string; name: string } | null>(null)
  const [floatAmount, setFloatAmount] = useState(1000)
  const [floatReason, setFloatReason] = useState('Admin float top-up')
  const [q, setQ] = useState('')

  const filteredAgents = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return agents
    return agents.filter((a) => {
      const hay = [
        a.name,
        a.phone,
        a.panelId != null ? String(a.panelId) : '',
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [agents, q])

  const active = agents.filter((a) => a.active).length
  const totalCommission = agents.reduce((s, a) => s + a.commission, 0)
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

  async function submitAccount() {
    if (!acctAgent) return
    if (acctNumber.trim().length < 3 || acctHolder.trim().length < 2) {
      showToast('Enter account number and holder name')
      return
    }
    setBusy(true)
    try {
      await addAgentAccount(acctAgent.id, { method: acctMethod, number: acctNumber.trim(), holder: acctHolder.trim() })
      setAcctAgent(null)
      setAcctNumber('')
      setAcctHolder('')
    } catch (e: any) {
      showToast(e?.message || 'Failed to add account')
    } finally {
      setBusy(false)
    }
  }

  async function submitFloat() {
    if (!floatAgent) return
    if (!floatAmount) {
      showToast('Enter an amount')
      return
    }
    setBusy(true)
    try {
      await adjustAgentFloat(floatAgent.id, floatAmount, floatReason.trim() || 'Admin float adjust')
      setFloatAgent(null)
    } catch (e: any) {
      showToast(e?.message || 'Float adjust failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHead
        title="C2C Merchants"
        subtitle="Create merchants · assign JazzCash/Easypaisa numbers · set order ranking % · top up float"
        actions={<button className="btn btn-primary" onClick={() => setShowCreate(true)}>{Icons.plus} Create merchant</button>}
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard icon="agents" tone="violet" value={`${active}/${agents.length}`} label="Active merchants" />
        <StatCard icon="money" tone="gold" value={money(pendingBalance)} label="Unpaid rewards" />
        <StatCard icon="referrals" tone="green" value={money(totalCommission)} label="Rewards earned" />
      </div>

      {agentAccounts.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-pad">
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Payment accounts awaiting review</h3>
            <p className="section-sub" style={{ marginBottom: 14 }}>{agentAccounts.length} merchant-submitted account(s) need approval.</p>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Merchant</th>
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
                        <button className="btn btn-primary btn-sm" onClick={() => approveAgentAccount(a.id)}>Verify / Approve</button>
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
            <div className="muted" style={{ fontSize: 13 }}>Merchants have {money(pendingBalance)} in COMMISSION buckets.</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>C2C merchants</h3>
          <input
            type="search"
            placeholder="Search Panel ID, name, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 260, padding: '8px 12px' }}
          />
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Panel ID</th>
                <th>Merchant</th>
                <th style={{ width: 110 }}>Order rank %</th>
                <th style={{ width: 130 }}>Wallets</th>
                <th className="t-right">Float unpaid</th>
                <th>Joined</th>
                <th>Active</th>
                <th className="t-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.map((a) => {
                const ready = a.walletsFilled >= settings.walletsRequired
                return (
                  <tr key={a.id}>
                    <td className="num" style={{ fontWeight: 800 }}>{a.panelId ?? '—'}</td>
                    <td>
                      <div className="cell-media">
                        <Avatar name={a.name} />
                        <div>
                          <div className="cell-main">{a.name}</div>
                          <div className="cell-sub">{a.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        defaultValue={a.orderSharePct}
                        key={`${a.id}-${a.orderSharePct}`}
                        title="Relative share of collection orders (e.g. 30 / 50 / 70). Normalized across active merchants."
                        style={{ width: 72, padding: '6px 8px', fontWeight: 700 }}
                        onBlur={(e) => {
                          const n = Math.max(0, Math.min(1000, Math.round(Number(e.target.value) || 0)))
                          if (n !== a.orderSharePct) updateAgent(a.id, { orderSharePct: n })
                          else e.target.value = String(a.orderSharePct)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        }}
                      />
                    </td>
                    <td>
                      <div className="flex gap8">
                        <Wallets filled={a.walletsFilled} total={settings.walletsRequired} />
                        <span className="muted" style={{ fontSize: 12 }}>{a.walletsFilled}/{settings.walletsRequired}</span>
                      </div>
                      {!ready && <div className="cell-sub red-t">Not eligible</div>}
                    </td>
                    <td className="t-right num">{money(a.commissionBalance)}</td>
                    <td className="muted">{a.joined}</td>
                    <td>
                      <div className="flex gap8">
                        <Toggle on={a.active} onChange={() => updateAgent(a.id, { active: !a.active })} />
                        {a.active ? <Pill tone="green">On</Pill> : <Pill tone="grey">Off</Pill>}
                      </div>
                    </td>
                    <td className="t-right">
                      <div className="flex gap8" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <Link className="btn btn-light btn-sm" to={`/users/${a.id}`}>Open</Link>
                        <button className="btn btn-light btn-sm" onClick={() => setAcctAgent({ id: a.id, name: a.name })}>
                          + Number
                        </button>
                        <button className="btn btn-light btn-sm" onClick={() => setFloatAgent({ id: a.id, name: a.name })}>
                          Float
                        </button>
                        {a.commissionBalance > 0 && (
                          <button className="btn btn-light btn-sm" onClick={() => payoutAgentCommission(a.id)}>Pay out</button>
                        )}
                      </div>
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
          title="Create merchant login"
          onClose={() => setShowCreate(false)}
          foot={
            <>
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitCreate} disabled={busy}>{busy ? 'Creating…' : 'Generate login'}</button>
            </>
          }
        >
          <p className="section-sub">Creates a C2C merchant panel account. Then assign JazzCash/Easypaisa numbers and float.</p>
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

      {acctAgent && (
        <Modal
          title={`Add collection number — ${acctAgent.name}`}
          onClose={() => setAcctAgent(null)}
          foot={
            <>
              <button className="btn btn-outline" onClick={() => setAcctAgent(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitAccount} disabled={busy}>{busy ? 'Saving…' : 'Add number'}</button>
            </>
          }
        >
          <p className="section-sub">Optional override — agents normally add their own JazzCash/Easypaisa numbers in C2C (up to 30 each; only one active per method).</p>
          <div className="fld" style={{ marginBottom: 14 }}>
            <label>Method</label>
            <select value={acctMethod} onChange={(e) => setAcctMethod(e.target.value)}>
              <option value="JAZZCASH">JazzCash</option>
              <option value="EASYPAISA">Easypaisa</option>
              <option value="BANK">Bank</option>
            </select>
          </div>
          <div className="fld" style={{ marginBottom: 14 }}>
            <label>Account number</label>
            <input value={acctNumber} onChange={(e) => setAcctNumber(e.target.value)} placeholder="03XXXXXXXXX" />
          </div>
          <div className="fld">
            <label>Account title</label>
            <input value={acctHolder} onChange={(e) => setAcctHolder(e.target.value)} placeholder="Name on account" />
          </div>
        </Modal>
      )}

      {floatAgent && (
        <Modal
          title={`Agent float — ${floatAgent.name}`}
          onClose={() => setFloatAgent(null)}
          foot={
            <>
              <button className="btn btn-outline" onClick={() => setFloatAgent(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitFloat} disabled={busy}>{busy ? 'Saving…' : 'Apply'}</button>
            </>
          }
        >
          <p className="section-sub">Float is used for pay-on-behalf. Positive = credit, negative = deduct. Agent earns only 2% of collections — never the deposit principal.</p>
          <div className="fld" style={{ marginBottom: 14 }}>
            <label>Amount (Rs)</label>
            <input type="number" value={floatAmount} onChange={(e) => setFloatAmount(Number(e.target.value))} />
          </div>
          <div className="fld">
            <label>Reason</label>
            <input value={floatReason} onChange={(e) => setFloatReason(e.target.value)} />
          </div>
        </Modal>
      )}

      {creds && <CredsModal creds={creds} onClose={() => setCreds(null)} />}
    </>
  )
}
