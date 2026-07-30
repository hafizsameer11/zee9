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

export default function ReferralAgents() {
  const { settings, showToast } = useAdmin()
  const [agents, setAgents] = useState<RefAgent[]>([])
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [downlineFor, setDownlineFor] = useState<{ id: string; name: string } | null>(null)
  const [downline, setDownline] = useState<DownlineRow[]>([])
  const [salaryFor, setSalaryFor] = useState<RefAgent | null>(null)
  const [approveAmt, setApproveAmt] = useState('')

  function mapAgent(a: any): RefAgent {
    const bal = Number(a.commissionBalance) / 100
    const approved = Number(a.salaryApproved ?? a.salaryApprovedPaisa ?? 0) / 100
    const hold =
      a.salaryHold != null ? Number(a.salaryHold) / 100 : Math.max(0, bal - approved)
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
      commission: Number(a.commission) / 100,
      commissionBalance: bal,
      downline: a.downline || { level1: 0, level2: 0, level3: 0 },
      createdAt: a.createdAt,
    }
  }

  async function load() {
    try {
      const rows = await api.get('/admin/referral-agents')
      setAgents((rows as any[]).map(mapAgent))
    } catch (e: any) {
      showToast(e?.message || 'Failed to load referral agents')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function toggle(id: string, active: boolean) {
    setBusy(true)
    try {
      await api.post(`/admin/referral-agents/${id}/active`, { active })
      await load()
    } catch (e: any) {
      showToast(e?.message || 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleTransfer(id: string, open: boolean) {
    setBusy(true)
    try {
      await api.post(`/admin/referral-agents/${id}/salary-transfer`, { open })
      showToast(open ? 'Transfer opened' : 'Transfer hidden')
      await load()
      if (salaryFor?.id === id) {
        setSalaryFor((prev) => (prev ? { ...prev, salaryTransferOpen: open } : prev))
      }
    } catch (e: any) {
      showToast(e?.message || 'Failed to update transfer')
    } finally {
      setBusy(false)
    }
  }

  async function approveSalary() {
    if (!salaryFor) return
    const amount = Number(approveAmt)
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Enter a valid amount')
      return
    }
    setBusy(true)
    try {
      const res = await api.post(`/admin/referral-agents/${salaryFor.id}/salary-approve`, { amount })
      showToast(`Approved Rs ${money(Number(res.approvedNow)).replace('Rs ', '')} — transfer open`)
      setApproveAmt('')
      await load()
      setSalaryFor((prev) =>
        prev
          ? {
              ...prev,
              salaryTransferOpen: true,
              salaryApproved: Number(res.salaryApproved),
              salaryHold: Number(res.salaryHold),
              commissionBalance: Number(res.commissionBalance),
            }
          : prev,
      )
    } catch (e: any) {
      showToast(e?.message || 'Approve failed')
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

  const filteredAgents = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return agents
    return agents.filter((a) => {
      const hay = [a.displayName, a.phone, a.playerNo != null ? String(a.playerNo) : '', a.role]
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [agents, q])

  const active = agents.filter((a) => a.referralAgentActive).length
  const eligible = agents.filter((a) => a.walletsFilled >= settings.walletsRequired).length
  const onHold = agents.reduce((s, a) => s + Number(a.salaryHold), 0)

  return (
    <>
      <PageHead
        title="Agents"
        subtitle="Referral salary · open Transfer per agent · approve partial amounts (rest stays on hold)"
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard icon="agents" tone="violet" value={`${active}/${agents.length}`} label="Active referral agents" />
        <StatCard icon="referrals" tone="green" value={String(eligible)} label="Eligible (wallets met)" />
        <StatCard icon="money" tone="gold" value={money(onHold)} label="Salary on hold" />
      </div>

      <div className="card card-pad" style={{ marginBottom: 24, fontSize: 13 }}>
        Rates: L1 {settings.commissionL1}% · L2 {settings.commissionL2}% · L3 {settings.commissionL3}% on net loss.
        New commission stays on <b>hold</b> until you approve. Transfer button shows only when Transfer is ON.
      </div>

      <div className="card">
        <div className="card-head" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Referral agents</h3>
          <input
            type="search"
            placeholder="Search Game ID, name, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 240, padding: '8px 12px' }}
          />
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Game ID</th>
                <th>Wallets</th>
                <th className="t-right">Balance</th>
                <th className="t-right">Approved</th>
                <th className="t-right">Hold</th>
                <th>Show Transfer</th>
                <th>Active</th>
                <th className="t-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.map((a) => (
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
                    <Toggle
                      on={a.salaryTransferOpen}
                      onChange={() => !busy && void toggleTransfer(a.id, !a.salaryTransferOpen)}
                    />
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
                          setApproveAmt('')
                        }}
                      >
                        Approve
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
              {filteredAgents.length === 0 && (
                <tr>
                  <td colSpan={9} className="muted" style={{ padding: 24 }}>
                    {agents.length === 0
                      ? 'No referral agents yet. Players accumulate qualified wallets; approve them here.'
                      : 'No matches'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {salaryFor && (
        <Modal title={`Salary · ${salaryFor.displayName}`} onClose={() => setSalaryFor(null)}>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Game ID {salaryFor.playerNo ?? '—'} · Balance {money(Number(salaryFor.commissionBalance))} · Approved{' '}
            {money(Number(salaryFor.salaryApproved))} · Hold {money(Number(salaryFor.salaryHold))}
          </p>
          <div className="flex gap8" style={{ alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13 }}>Show Transfer button</span>
            <Toggle
              on={salaryFor.salaryTransferOpen}
              onChange={() => !busy && void toggleTransfer(salaryFor.id, !salaryFor.salaryTransferOpen)}
            />
          </div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
            Approve amount from hold (Rs)
          </label>
          <input
            className="input"
            type="number"
            min={1}
            step={1}
            placeholder={`Max ${Number(salaryFor.salaryHold)}`}
            value={approveAmt}
            onChange={(e) => setApproveAmt(e.target.value)}
            style={{ width: '100%', marginBottom: 12 }}
          />
          <div className="flex gap8" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setSalaryFor(null)}>
              Close
            </button>
            <button className="btn btn-primary" disabled={busy} onClick={() => void approveSalary()}>
              Approve &amp; open transfer
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
                  <th>Member</th>
                  <th>Phone</th>
                  <th>Game ID</th>
                  <th>Status</th>
                  <th>Profile</th>
                </tr>
              </thead>
              <tbody>
                {downline.map((r) => (
                  <tr key={`${r.level}-${r.id}`}>
                    <td>
                      <Pill tone={r.level === 1 ? 'violet' : r.level === 2 ? 'blue' : 'grey'}>L{r.level}</Pill>
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
                  </tr>
                ))}
                {downline.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
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
