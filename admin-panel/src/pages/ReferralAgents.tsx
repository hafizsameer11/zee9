import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead, Pill, Toggle, Avatar, StatCard, Modal, money } from '../components/ui'
import { useAdmin } from '../data/store'
import { api } from '../api/client'

type RefAgent = {
  id: string
  displayName: string
  phone: string
  playerNo: number | null
  role: string
  referralAgentActive: boolean
  salaryTransferOpen: boolean
  salaryApproved: number
  salaryHold: number
  walletsFilled: number
  referrals: number
  commission: number | string
  commissionBalance: number | string
  downline: { level1: number; level2: number; level3: number }
  createdAt: string
}

type DownlineRow = {
  level: number
  id: string
  name: string
  phone: string
  playerNo: number | null
  status: string
  joinedAt: string
  isReferralAgent: boolean
}

type Tab = 'agents' | 'promoters'

function mapAgent(a: any): RefAgent {
  const bal = Number(a.commissionBalance ?? 0)
  const approved = Number(a.salaryApproved ?? 0)
  const hold = a.salaryHold != null ? Number(a.salaryHold) : Math.max(0, bal - approved)
  return {
    id: a.id,
    displayName: a.displayName || a.name,
    phone: a.phone,
    playerNo: a.playerNo != null ? Number(a.playerNo) : null,
    role: a.role,
    referralAgentActive: a.referralAgentActive,
    salaryTransferOpen: !!a.salaryTransferOpen,
    salaryApproved: approved,
    salaryHold: hold,
    walletsFilled: a.walletsFilled,
    referrals: a.referrals,
    commission: Number(a.commission ?? 0),
    commissionBalance: bal,
    downline: a.downline || { level1: 0, level2: 0, level3: 0 },
    createdAt: a.createdAt,
  }
}

export default function ReferralAgents() {
  const { settings, showToast } = useAdmin()
  const [tab, setTab] = useState<Tab>('agents')
  const [agents, setAgents] = useState<RefAgent[]>([])
  const [promoters, setPromoters] = useState<RefAgent[]>([])
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [downlineFor, setDownlineFor] = useState<{ id: string; name: string } | null>(null)
  const [downline, setDownline] = useState<DownlineRow[]>([])
  const [salaryFor, setSalaryFor] = useState<RefAgent | null>(null)
  const [approveAmt, setApproveAmt] = useState('')

  async function loadAgents() {
    const rows = await api.get('/admin/referral-agents?view=agents')
    setAgents((rows as any[]).map(mapAgent))
  }

  async function loadPromoters() {
    const rows = await api.get('/admin/referral-agents?view=promoters')
    setPromoters((rows as any[]).map(mapAgent))
  }

  async function loadAll() {
    try {
      await Promise.all([loadAgents(), loadPromoters()])
    } catch (e: any) {
      showToast(e?.message || 'Failed to load referral data')
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  async function toggle(id: string, active: boolean) {
    setBusy(true)
    try {
      await api.post(`/admin/referral-agents/${id}/active`, { active })
      await loadAll()
      showToast(active ? 'Agent activated' : 'Agent deactivated')
    } catch (e: any) {
      showToast(e?.message || 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleWithdraw(id: string, open: boolean) {
    setBusy(true)
    try {
      await api.post(`/admin/referral-agents/${id}/salary-transfer`, { open })
      showToast(open ? 'Salary withdraw opened' : 'Salary withdraw frozen')
      await loadAgents()
      if (salaryFor?.id === id) {
        setSalaryFor((prev) => (prev ? { ...prev, salaryTransferOpen: open } : prev))
      }
    } catch (e: any) {
      showToast(e?.message || 'Failed to update withdraw')
    } finally {
      setBusy(false)
    }
  }

  async function setWithdrawAmount() {
    if (!salaryFor) return
    const amount = Number(approveAmt)
    if (!Number.isFinite(amount) || amount < 0) {
      showToast('Enter a valid amount')
      return
    }
    const max = Number(salaryFor.commissionBalance)
    if (amount > max) {
      showToast(`Max is Rs ${max.toLocaleString('en-PK')}`)
      return
    }
    setBusy(true)
    try {
      const res = await api.post(`/admin/referral-agents/${salaryFor.id}/salary-approve`, {
        amount,
        mode: 'set',
      })
      showToast(`Withdrawable set to Rs ${Number(res.salaryApproved).toLocaleString('en-PK')}`)
      setApproveAmt('')
      await loadAgents()
      setSalaryFor((prev) =>
        prev
          ? {
              ...prev,
              salaryTransferOpen: !!res.salaryTransferOpen,
              salaryApproved: Number(res.salaryApproved),
              salaryHold: Number(res.salaryHold),
              commissionBalance: Number(res.commissionBalance),
            }
          : prev,
      )
    } catch (e: any) {
      showToast(e?.message || 'Failed to set amount')
    } finally {
      setBusy(false)
    }
  }

  async function openDownline(a: RefAgent) {
    setDownlineFor({ id: a.id, name: a.displayName })
    try {
      const rows = await api.get(`/admin/referral-agents/${a.id}/downline`)
      setDownline(rows as DownlineRow[])
    } catch (e: any) {
      showToast(e?.message || 'Failed to load downline')
      setDownline([])
    }
  }

  async function removeFromTree(memberId: string, memberName: string) {
    if (!window.confirm(`Remove ${memberName} from the referral tree? Their downline stays under them.`)) return
    setBusy(true)
    try {
      await api.post(`/admin/users/${memberId}/unlink-referral`)
      showToast(`${memberName} removed from referral tree`)
      if (downlineFor) {
        const rows = await api.get(`/admin/referral-agents/${downlineFor.id}/downline`)
        setDownline(rows as DownlineRow[])
      }
      await loadAll()
    } catch (e: any) {
      showToast(e?.message || 'Remove failed')
    } finally {
      setBusy(false)
    }
  }

  async function removeAgent(a: RefAgent) {
    if (
      !window.confirm(
        `Deactivate referral agent ${a.displayName}? They stay as a player but lose agent status.`,
      )
    )
      return
    setBusy(true)
    try {
      await api.post(`/admin/referral-agents/${a.id}/active`, { active: false })
      showToast(`${a.displayName} deactivated`)
      await loadAll()
    } catch (e: any) {
      showToast(e?.message || 'Deactivate failed')
    } finally {
      setBusy(false)
    }
  }

  const rows = tab === 'agents' ? agents : promoters

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((a) => {
      const hay = [a.displayName, a.phone, a.playerNo != null ? String(a.playerNo) : '', a.role]
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [rows, q])

  const withdrawOpen = agents.filter((a) => a.salaryTransferOpen).length
  const onHold = agents.reduce((s, a) => s + Number(a.salaryHold), 0)

  return (
    <>
      <PageHead
        title="Agents"
        subtitle={
          tab === 'agents'
            ? 'Active referral agents — freeze salary, set withdraw amount, rest stays on hold'
            : 'Players building toward agentship — need 5 qualified wallets or manual activation'
        }
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard icon="agents" tone="violet" value={String(agents.length)} label="Active referral agents" />
        <StatCard icon="users" tone="blue" value={String(promoters.length)} label="Promoters in progress" />
        <StatCard icon="money" tone="green" value={money(onHold)} label="Salary on hold (agents)" />
      </div>

      <div className="card card-pad" style={{ marginBottom: 24, fontSize: 13 }}>
        Rates: L1 {settings.commissionL1}% · L2 {settings.commissionL2}% · L3 {settings.commissionL3}% on member net loss
        (deposits + signup/deposit bonuses). Agents need <b>{settings.walletsRequired} wallets</b> of{' '}
        <b>{money(settings.minPerWallet)}</b> each (auto) or admin activation. By default <b>Withdraw is frozen</b>{' '}
        for every agent.
      </div>

      <div className="card">
        <div
          className="card-head"
          style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
        >
          <div className="flex gap8" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="tabs-bar" style={{ marginBottom: 0 }}>
              <button
                type="button"
                className={'tab-btn' + (tab === 'agents' ? ' active' : '')}
                onClick={() => setTab('agents')}
              >
                Active agents ({agents.length})
              </button>
              <button
                type="button"
                className={'tab-btn' + (tab === 'promoters' ? ' active' : '')}
                onClick={() => setTab('promoters')}
              >
                Promoters ({promoters.length})
              </button>
            </div>
          </div>
          <input
            type="search"
            placeholder="Search Game ID, name, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 240, padding: '8px 12px' }}
          />
        </div>

        {tab === 'agents' ? (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Game ID</th>
                  <th>Wallets</th>
                  <th className="t-right">Balance</th>
                  <th className="t-right">Can withdraw</th>
                  <th className="t-right">On hold</th>
                  <th>Withdraw</th>
                  <th>Active</th>
                  <th className="t-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="cell-media">
                        <Avatar name={a.displayName} />
                        <div>
                          <div className="cell-main">{a.displayName}</div>
                          <div className="cell-sub">
                            {a.phone} · L3 {a.downline.level3} / L2 {a.downline.level2} / L1 {a.downline.level1}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 800 }}>
                      {a.playerNo ?? '—'}
                    </td>
                    <td>
                      <Pill tone={a.walletsFilled >= settings.walletsRequired ? 'green' : 'grey'}>
                        {a.walletsFilled}/{settings.walletsRequired}
                      </Pill>
                    </td>
                    <td className="t-right num">{money(Number(a.commissionBalance))}</td>
                    <td className="t-right num">{money(Number(a.salaryApproved))}</td>
                    <td className="t-right num">{money(Number(a.salaryHold))}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        <Toggle
                          on={a.salaryTransferOpen}
                          onChange={() => !busy && void toggleWithdraw(a.id, !a.salaryTransferOpen)}
                        />
                        <span className="muted" style={{ fontSize: 11 }}>
                          {a.salaryTransferOpen ? 'Open' : 'Frozen'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <Toggle
                        on={a.referralAgentActive}
                        onChange={() => !busy && toggle(a.id, !a.referralAgentActive)}
                      />
                    </td>
                    <td className="t-right">
                      <div className="flex gap8" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setSalaryFor(a)
                            setApproveAmt(String(Math.floor(Number(a.salaryApproved)) || ''))
                          }}
                        >
                          Set amount
                        </button>
                        <button className="btn btn-light btn-sm" onClick={() => openDownline(a)}>
                          Downline
                        </button>
                        <Link className="btn btn-ghost btn-sm" to={`/users/${a.id}`}>
                          Profile
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={busy}
                          onClick={() => void removeAgent(a)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="muted" style={{ padding: 24 }}>
                      {agents.length === 0 ? 'No active referral agents yet.' : 'No matches'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Game ID</th>
                  <th>Progress</th>
                  <th>Downline</th>
                  <th className="t-right">Promoter earnings</th>
                  <th className="t-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="cell-media">
                        <Avatar name={a.displayName} />
                        <div>
                          <div className="cell-main">{a.displayName}</div>
                          <div className="cell-sub">{a.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 800 }}>
                      {a.playerNo ?? '—'}
                    </td>
                    <td>
                      <Pill tone={a.walletsFilled >= settings.walletsRequired ? 'amber' : 'grey'}>
                        {a.walletsFilled}/{settings.walletsRequired} wallets
                      </Pill>
                      {a.walletsFilled >= settings.walletsRequired && (
                        <div className="cell-sub" style={{ marginTop: 4 }}>
                          Ready — activate to make agent
                        </div>
                      )}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      L3 {a.downline.level3} · L2 {a.downline.level2} · L1 {a.downline.level1}
                    </td>
                    <td className="t-right num">{money(Number(a.commissionBalance))}</td>
                    <td className="t-right">
                      <div className="flex gap8" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={busy}
                          onClick={() => !busy && void toggle(a.id, true)}
                        >
                          Activate agent
                        </button>
                        <button className="btn btn-light btn-sm" onClick={() => openDownline(a)}>
                          Downline
                        </button>
                        <Link className="btn btn-ghost btn-sm" to={`/users/${a.id}`}>
                          Profile
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted" style={{ padding: 24 }}>
                      {promoters.length === 0
                        ? 'No promoters in progress. Players appear here after their referrals deposit.'
                        : 'No matches'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {salaryFor && (
        <Modal title={`Salary withdraw · ${salaryFor.displayName}`} onClose={() => setSalaryFor(null)}>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Game ID {salaryFor.playerNo ?? '—'} · Total commission{' '}
            {money(Number(salaryFor.commissionBalance))} · Can withdraw{' '}
            {money(Number(salaryFor.salaryApproved))} · On hold {money(Number(salaryFor.salaryHold))}
          </p>
          <div className="flex gap8" style={{ alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {salaryFor.salaryTransferOpen ? 'Withdraw open' : 'Withdraw frozen'}
            </span>
            <Toggle
              on={salaryFor.salaryTransferOpen}
              onChange={() => !busy && void toggleWithdraw(salaryFor.id, !salaryFor.salaryTransferOpen)}
            />
          </div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
            How much can this agent withdraw? (Rs)
          </label>
          <input
            className="input"
            type="number"
            min={0}
            step={1}
            placeholder={`0 – ${Number(salaryFor.commissionBalance)}`}
            value={approveAmt}
            onChange={(e) => setApproveAmt(e.target.value)}
            style={{ width: '100%', marginBottom: 8 }}
          />
          <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
            Example: balance Rs 300,000 → set 30,000. Agent can withdraw only Rs 30,000; Rs 270,000 stays on hold
            until you approve more. Withdraw button stays hidden while Frozen.
          </p>
          <div className="flex gap8" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              disabled={busy}
              onClick={() => {
                setApproveAmt('0')
              }}
            >
              Clear to 0
            </button>
            <button className="btn btn-outline" onClick={() => setSalaryFor(null)}>
              Close
            </button>
            <button className="btn btn-primary" disabled={busy} onClick={() => void setWithdrawAmount()}>
              Save amount
            </button>
          </div>
        </Modal>
      )}

      {downlineFor && (
        <Modal title={`Downline · ${downlineFor.name} (L3 → L1)`} onClose={() => setDownlineFor(null)}>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Type</th>
                  <th>Member</th>
                  <th>Phone</th>
                  <th>Game ID</th>
                  <th>Status</th>
                  <th>Profile</th>
                  <th>Remove</th>
                </tr>
              </thead>
              <tbody>
                {downline.map((r) => (
                  <tr key={`${r.level}-${r.id}`}>
                    <td>
                      <Pill tone={r.level === 1 ? 'violet' : r.level === 2 ? 'blue' : 'grey'}>L{r.level}</Pill>
                    </td>
                    <td>
                      <Pill tone={r.isReferralAgent ? 'violet' : 'blue'}>
                        {r.isReferralAgent ? 'Agent' : 'Member'}
                      </Pill>
                    </td>
                    <td>{r.name}</td>
                    <td className="num">{r.phone}</td>
                    <td className="num">{r.playerNo ?? '—'}</td>
                    <td>{r.status}</td>
                    <td>
                      <Link className="btn btn-light btn-sm" to={`/users/${r.id}`} onClick={() => setDownlineFor(null)}>
                        Open
                      </Link>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => void removeFromTree(r.id, r.name)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {downline.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted">
                      No downline yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </>
  )
}
