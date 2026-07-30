import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHead, Pill, money, Modal } from '../components/ui'
import { api } from '../api/client'
import { useAdmin } from '../data/store'

const r = (paisa: number | bigint | undefined) => Number(paisa ?? 0) / 100

type Detail = {
  user: {
    id: string
    gameId?: string
    phone: string
    displayName: string
    role: string
    status: string
    vipLevel: number
    playerNo?: number
    panelId?: number | null
    referralCode: string
    referredById: string | null
    agentActive: boolean
    referralAgentActive?: boolean
    walletsFilled: number
    channelCode: string | null
    bindCode: string | null
    createdAt: string
  }
  wallet: { MAIN: number; BONUS: number; FROZEN: number; COMMISSION: number }
  deposits: any[]
  withdrawals: any[]
  bonuses: any[]
  directReferrals: number
  commissionEarned: number
  accounts: any[]
  channels: any[]
  wagerSummary: { totalBet: number; rounds: number }
  gamePlayStats?: Array<{
    game: string
    gameName: string
    bet: number
    win: number
    winLoss: number
    winningPct: number
    lossPct: number
    rtpPct: number
    profitable: boolean
  }>
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { showToast, reset } = useAdmin()
  const [data, setData] = useState<Detail | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [vip, setVip] = useState(1)
  const [channelCode, setChannelCode] = useState('')
  const [bindCode, setBindCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwShown, setPwShown] = useState<string | null>(null)

  const [walletOpen, setWalletOpen] = useState(false)
  const [bucket, setBucket] = useState<'MAIN' | 'BONUS' | 'COMMISSION'>('MAIN')
  const [walletAmt, setWalletAmt] = useState(0)
  const [walletReason, setWalletReason] = useState('Admin adjust')

  const [wagerOpen, setWagerOpen] = useState(false)
  const [wagerMode, setWagerMode] = useState<'add' | 'set' | 'required'>('add')
  const [wagerAmt, setWagerAmt] = useState(0)
  const [wagerBonusId, setWagerBonusId] = useState('')

  const [mentorOpen, setMentorOpen] = useState(false)
  const [mentorChannelCode, setMentorChannelCode] = useState('')
  const [mentorChannelName, setMentorChannelName] = useState('')
  const [mentorPassword, setMentorPassword] = useState('')
  const [promoteCreds, setPromoteCreds] = useState<{ password: string; channel?: string } | null>(null)

  type DownlineRow = {
    id: string
    gameId: string
    playerNo?: number | null
    name: string
    phone: string
    status: string
    kind: 'AGENT' | 'MEMBER'
    isReferralAgent: boolean
    channelCode: string | null
    level: number
    ratePct: number
    deposited: number
    withdrawn: number
    winLoss: number
    commission: number
  }
  const [downline, setDownline] = useState<DownlineRow[]>([])
  const [downlineRates, setDownlineRates] = useState({ l1: 30, l2: 10, l3: 10 })
  const [downlineTotals, setDownlineTotals] = useState({
    members: 0,
    agents: 0,
    deposited: 0,
    withdrawn: 0,
    winLoss: 0,
    commission: 0,
  })
  const [downlineQ, setDownlineQ] = useState('')
  const [downlineAgentsOnly, setDownlineAgentsOnly] = useState(false)
  const [downlineBusy, setDownlineBusy] = useState(false)
  const [banBusyId, setBanBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setErr('')
    try {
      const d = await api.get(`/admin/users/${id}`)
      setData(d)
      setName(d.user.displayName || '')
      setPhone(d.user.phone || '')
      setVip(d.user.vipLevel ?? 1)
      setChannelCode(d.user.channelCode || '')
      setBindCode(d.user.bindCode || '')
    } catch (e: any) {
      setErr(e?.message || 'User not found')
      setData(null)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const loadDownline = useCallback(
    async (opts?: { q?: string; agentsOnly?: boolean }) => {
      if (!id) return
      const q = opts?.q ?? downlineQ
      const agentsOnly = opts?.agentsOnly ?? downlineAgentsOnly
      setDownlineBusy(true)
      try {
        const qs = new URLSearchParams()
        if (q.trim()) qs.set('q', q.trim())
        if (agentsOnly) qs.set('agents', 'true')
        const suffix = qs.toString() ? `?${qs}` : ''
        const res = await api.get(`/admin/mentors/${id}/downline${suffix}`)
        setDownline(res.items || [])
        setDownlineRates(res.rates || { l1: 30, l2: 10, l3: 10 })
        setDownlineTotals(
          res.totals || { members: 0, agents: 0, deposited: 0, withdrawn: 0, winLoss: 0, commission: 0 },
        )
      } catch (e: any) {
        showToast(e?.message || 'Failed to load downline')
        setDownline([])
      } finally {
        setDownlineBusy(false)
      }
    },
    [id, downlineQ, downlineAgentsOnly, showToast],
  )

  useEffect(() => {
    if (!data) return
    if (data.user.role === 'MENTOR' || (data.channels?.length ?? 0) > 0) {
      void loadDownline({ q: '', agentsOnly: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when mentor profile arrives
  }, [id, data?.user.role, data?.channels?.length])

  async function banDownlineMember(memberId: string, status: 'ACTIVE' | 'BANNED') {
    setBanBusyId(memberId)
    try {
      await api.post(`/admin/users/${memberId}/status`, { status })
      showToast(status === 'BANNED' ? 'Game ID blocked' : 'Unbanned')
      await loadDownline()
    } catch (e: any) {
      showToast(e?.message || 'Status update failed')
    } finally {
      setBanBusyId(null)
    }
  }

  async function saveProfile() {
    if (!id || !data) return
    setBusy(true)
    try {
      const isC2c = data.user.role === 'AGENT'
      await api.patch(`/admin/users/${id}`, {
        displayName: name.trim(),
        phone: phone.trim(),
        ...(isC2c
          ? {}
          : {
              vipLevel: vip,
              channelCode: channelCode.trim() || null,
              bindCode: bindCode.trim() || null,
            }),
      })
      showToast('Profile saved')
      await load()
      reset()
    } catch (e: any) {
      showToast(e?.message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function changePanelPassword() {
    if (!id || !data) return
    setPwBusy(true)
    setPwShown(null)
    try {
      const body = newPassword.trim() ? { password: newPassword.trim() } : {}
      const path =
        data.user.role === 'MENTOR'
          ? `/admin/mentors/${id}/reset-password`
          : `/admin/agents/${id}/reset-password`
      const creds = await api.post(path, body)
      setPwShown(creds.password)
      setNewPassword('')
      showToast('Password updated')
    } catch (e: any) {
      showToast(e?.message || 'Password change failed')
    } finally {
      setPwBusy(false)
    }
  }

  async function setStatus(status: 'ACTIVE' | 'BANNED') {
    if (!id) return
    await api.post(`/admin/users/${id}/status`, { status })
    showToast(status === 'BANNED' ? 'Banned' : 'Activated')
    load()
  }

  async function makeReferralAgent(active: boolean) {
    if (!id) return
    setBusy(true)
    try {
      await api.post(`/admin/referral-agents/${id}/active`, { active })
      showToast(active ? 'Promoted to Agent (referral)' : 'Agent status removed')
      await load()
      reset()
    } catch (e: any) {
      showToast(e?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  function openMentorModal() {
    if (!data) return
    setMentorChannelCode(`m${data.user.playerNo ?? ''}`)
    setMentorChannelName(`${data.user.displayName} channel`)
    setMentorPassword('')
    setMentorOpen(true)
  }

  async function submitMakeMentor() {
    if (!id) return
    setBusy(true)
    try {
      const body: Record<string, string> = {}
      if (mentorChannelCode.trim()) body.channelCode = mentorChannelCode.trim()
      if (mentorChannelName.trim()) body.channelName = mentorChannelName.trim()
      if (mentorPassword.trim()) body.password = mentorPassword.trim()
      const result = await api.post(`/admin/users/${id}/make-mentor`, body)
      setMentorOpen(false)
      if (result.password) {
        setPromoteCreds({ password: result.password, channel: result.channel?.code })
      }
      showToast(result.alreadyMentor ? 'Already a mentor' : 'Promoted to Mentor')
      await load()
      reset()
    } catch (e: any) {
      showToast(e?.message || 'Make mentor failed')
    } finally {
      setBusy(false)
    }
  }

  async function demoteFromMentor() {
    if (!id) return
    setBusy(true)
    try {
      await api.post(`/admin/users/${id}/demote-mentor`, {})
      showToast('Demoted to player')
      await load()
      reset()
    } catch (e: any) {
      showToast(e?.message || 'Demote failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleAgentActive() {
    if (!id || !data) return
    await api.patch(`/admin/users/${id}`, { agentActive: !data.user.agentActive })
    showToast('C2C merchant active updated')
    load()
  }

  async function reviewAccount(accountId: string, action: 'approve' | 'reject') {
    setBusy(true)
    try {
      if (action === 'approve') {
        await api.post(`/admin/agent-accounts/${accountId}/approve`, {})
        showToast('Number approved — merchant can turn collection On')
      } else {
        await api.post(`/admin/agent-accounts/${accountId}/reject`, {})
        showToast('Number rejected')
      }
      await load()
      reset()
    } catch (e: any) {
      showToast(e?.message || 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function applyWallet() {
    if (!id || walletAmt === 0) {
      showToast('Enter a non-zero amount')
      return
    }
    setBusy(true)
    try {
      await api.post('/admin/wallet/adjust', {
        userId: id,
        bucket,
        amount: walletAmt,
        reason: walletReason.trim() || 'Admin adjust',
      })
      showToast('Balance updated')
      setWalletOpen(false)
      await load()
      reset()
    } catch (e: any) {
      showToast(e?.message || 'Wallet adjust failed')
    } finally {
      setBusy(false)
    }
  }

  async function applyWager() {
    if (!id) return
    setBusy(true)
    try {
      await api.post(`/admin/users/${id}/wager`, {
        mode: wagerMode,
        amount: wagerAmt,
        ...(wagerBonusId ? { bonusId: wagerBonusId } : {}),
      })
      showToast('Wager updated')
      setWagerOpen(false)
      await load()
    } catch (e: any) {
      showToast(e?.message || 'Wager update failed')
    } finally {
      setBusy(false)
    }
  }

  if (err) {
    return (
      <>
        <PageHead title="User" subtitle={err} actions={<button className="btn btn-outline" onClick={() => nav(-1)}>Back</button>} />
      </>
    )
  }

  if (!data) {
    return <PageHead title="User" subtitle="Loading…" />
  }

  const u = data.user
  const isC2c = u.role === 'AGENT'
  const isMentor = u.role === 'MENTOR' || (data.channels?.length ?? 0) > 0
  const title = isC2c
    ? `C2C Merchant — ${u.displayName}`
    : isMentor
      ? `Mentor — ${u.displayName}`
      : `Player — ${u.displayName}`

  return (
    <>
      <PageHead
        title={title}
        subtitle={
          isC2c
            ? `Panel ID ${u.panelId ?? '—'} · ${u.phone}`
            : `Player ID ${u.playerNo != null ? u.playerNo : (u.gameId || u.id.slice(-8))} · ${u.phone}`
        }
        actions={
          <div className="flex gap8">
            {isC2c && <Link className="btn btn-outline" to="/c2c">C2C Merchants</Link>}
            {!isC2c && <Link className="btn btn-outline" to="/players">Players</Link>}
            {isMentor && <Link className="btn btn-outline" to="/channels">Channels</Link>}
            <button className="btn btn-outline" onClick={() => nav(-1)}>Back</button>
          </div>
        }
      />

      <div className="grid grid-2" style={{ gridTemplateColumns: '1.1fr 1fr', alignItems: 'start', gap: 18 }}>
        <div className="card card-pad">
          <h3 className="section-title">Profile</h3>
          <p className="section-sub">
            {isC2c ? 'C2C merchant profile — JazzCash / EasyPaisa collections only.' : 'Edit any field and save. Full admin control.'}
          </p>
          <div className="form-grid">
            <div className="fld">
              <label>Display name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="fld">
              <label>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {isC2c ? (
              <>
                <div className="fld">
                  <label>Panel ID</label>
                  <input value={u.panelId != null ? String(u.panelId) : '—'} readOnly />
                </div>
                <div className="fld">
                  <label>Merchant status</label>
                  <input value={u.agentActive ? 'Active (collecting)' : 'Inactive'} readOnly />
                </div>
              </>
            ) : (
              <>
                <div className="fld">
                  <label>VIP level</label>
                  <input type="number" value={vip} onChange={(e) => setVip(Number(e.target.value))} />
                </div>
                <div className="fld">
                  <label>Player ID</label>
                  <input value={u.playerNo != null ? String(u.playerNo) : (u.gameId || u.id.slice(-8))} readOnly />
                </div>
                <div className="fld">
                  <label>Full user ID</label>
                  <input value={u.id} readOnly />
                </div>
                <div className="fld">
                  <label>Referral / share code</label>
                  <input value={u.referralCode} readOnly />
                </div>
                <div className="fld">
                  <label>Channel code</label>
                  <input value={channelCode} onChange={(e) => setChannelCode(e.target.value)} />
                </div>
                <div className="fld">
                  <label>Bind code</label>
                  <input value={bindCode} onChange={(e) => setBindCode(e.target.value)} />
                </div>
              </>
            )}
          </div>

          {(isC2c || u.role === 'MENTOR') && (
            <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-soft, #f6f6fb)', borderRadius: 10 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Password</div>
              <p className="section-sub" style={{ marginTop: 0 }}>
                Set the exact password you want. Leave blank only to auto-generate.
              </p>
              <div className="flex gap8" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ flex: 1, minWidth: 160 }}
                />
                <button className="btn btn-outline" disabled={pwBusy} onClick={() => void changePanelPassword()}>
                  {pwBusy ? '…' : 'Change password'}
                </button>
              </div>
              {pwShown && (
                <div style={{ marginTop: 10, fontFamily: 'monospace', fontWeight: 800 }}>
                  New password: {pwShown}{' '}
                  <button className="btn btn-light btn-sm" onClick={() => navigator.clipboard?.writeText(pwShown)}>Copy</button>
                </div>
              )}
            </div>
          )}

          <div className="flex gap8" style={{ marginTop: 16, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={busy} onClick={saveProfile}>{busy ? '…' : 'Save profile'}</button>
            {u.status === 'ACTIVE' ? (
              <button className="btn btn-danger" onClick={() => setStatus('BANNED')}>Ban</button>
            ) : (
              <button className="btn btn-success" onClick={() => setStatus('ACTIVE')}>Unban</button>
            )}
            {!isC2c && u.role !== 'MENTOR' && !u.referralAgentActive && (
              <button className="btn btn-light" disabled={busy} onClick={() => void makeReferralAgent(true)}>
                Make Agent
              </button>
            )}
            {!isC2c && u.referralAgentActive && (
              <button className="btn btn-light" disabled={busy} onClick={() => void makeReferralAgent(false)}>
                Remove Agent
              </button>
            )}
            {!isC2c && u.role !== 'MENTOR' && (
              <button className="btn btn-light" disabled={busy} onClick={openMentorModal}>
                Make Mentor
              </button>
            )}
            {u.role === 'MENTOR' && (
              <button className="btn btn-light" disabled={busy} onClick={() => void demoteFromMentor()}>
                Demote Mentor
              </button>
            )}
            {isC2c && (
              <button className="btn btn-light" onClick={toggleAgentActive}>
                Collections {u.agentActive ? 'Active → Off' : 'Off → Active'}
              </button>
            )}
          </div>
          <div style={{ marginTop: 12 }} className="muted">
            Role: <Pill tone="violet">{isC2c ? 'C2C MERCHANT' : u.role}</Pill>{' '}
            {u.referralAgentActive && <Pill tone="blue">AGENT</Pill>}{' '}
            Status: <Pill tone={u.status === 'ACTIVE' ? 'green' : 'red'}>{u.status}</Pill>{' '}
            Joined: {String(u.createdAt).slice(0, 10)}
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="section-title">Balances</h3>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="fld"><label>MAIN</label><div className="num cell-main" style={{ fontSize: 22 }}>{money(r(data.wallet.MAIN))}</div></div>
            <div className="fld"><label>BONUS</label><div className="num gold-t" style={{ fontSize: 22 }}>{money(r(data.wallet.BONUS))}</div></div>
            <div className="fld"><label>FROZEN</label><div className="num">{money(r(data.wallet.FROZEN))}</div></div>
            <div className="fld"><label>COMMISSION</label><div className="num">{money(r(data.wallet.COMMISSION))}</div></div>
          </div>
          <p className="section-sub" style={{ marginTop: 8 }}>
            {isC2c ? (
              <>C2C rewards earned: {money(r(data.commissionEarned))}</>
            ) : (
              <>
                Referrals: {data.directReferrals} · Commission earned: {money(r(data.commissionEarned))} ·
                Total wagered: {money(r(data.wagerSummary?.totalBet))} ({data.wagerSummary?.rounds ?? 0} rounds)
              </>
            )}
          </p>
          <div className="flex gap8" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => setWalletOpen(true)}>Adjust balance</button>
            {!isC2c && (
              <button className="btn btn-outline" onClick={() => setWagerOpen(true)}>Set / add wager</button>
            )}
          </div>
        </div>
      </div>

      {data.accounts?.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head">
            <h3>Collection numbers</h3>
            <p className="section-sub" style={{ margin: 0 }}>Approve first — then the merchant can turn collection On.</p>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Number</th>
                  <th>Holder</th>
                  <th>Review</th>
                  <th>Collection</th>
                  <th className="t-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.method}</td>
                    <td className="num">{a.number}</td>
                    <td>{a.holder}</td>
                    <td>
                      {a.awaitingReview ? (
                        <Pill tone="amber">Pending</Pill>
                      ) : (
                        <Pill tone="green">Approved</Pill>
                      )}
                    </td>
                    <td>
                      {a.awaitingReview ? (
                        <span className="muted">—</span>
                      ) : a.enabled ? (
                        <Pill tone="green">On</Pill>
                      ) : (
                        <Pill tone="grey">Off</Pill>
                      )}
                    </td>
                    <td className="t-right">
                      {a.awaitingReview ? (
                        <div className="flex gap8" style={{ justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={busy}
                            onClick={() => void reviewAccount(a.id, 'approve')}
                          >
                            Verify / Approve
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={busy}
                            onClick={() => void reviewAccount(a.id, 'reject')}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>Ready for merchant</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isC2c && data.channels?.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head"><h3>Owned channels</h3></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Code</th><th>Status</th></tr></thead>
              <tbody>
                {data.channels.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.code}</td>
                    <td>{c.enabled ? <Pill tone="green">On</Pill> : <Pill tone="grey">Off</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isMentor && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3>Downline</h3>
              <p className="section-sub" style={{ margin: '4px 0 0' }}>
                Mentor rates L1 {downlineRates.l1}% · L2 {downlineRates.l2}% · L3 {downlineRates.l3}% ·{' '}
                {downlineTotals.members} members ({downlineTotals.agents} agents) · Commission total{' '}
                {money(downlineTotals.commission)}
              </p>
            </div>
            <div className="flex gap8" style={{ marginLeft: 'auto', flexWrap: 'wrap' }}>
              <input
                className="input"
                style={{ width: 180 }}
                placeholder="Search Game ID / phone"
                value={downlineQ}
                onChange={(e) => setDownlineQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void loadDownline()
                }}
              />
              <label className="flex gap8" style={{ alignItems: 'center', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={downlineAgentsOnly}
                  onChange={(e) => {
                    const next = e.target.checked
                    setDownlineAgentsOnly(next)
                    void loadDownline({ agentsOnly: next })
                  }}
                />
                Agents only
              </label>
              <button className="btn btn-outline btn-sm" disabled={downlineBusy} onClick={() => void loadDownline()}>
                {downlineBusy ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Game ID</th>
                  <th>Type</th>
                  <th>Name</th>
                  <th className="t-right">Deposit</th>
                  <th className="t-right">Withdraw</th>
                  <th className="t-right">Win/Loss</th>
                  <th className="t-right">Rate</th>
                  <th className="t-right">Commission</th>
                  <th>Status</th>
                  <th className="t-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {downline.map((row) => (
                  <tr key={row.id}>
                    <td className="num">
                      <Link to={`/users/${row.id}`}>{row.gameId}</Link>
                      {row.channelCode && <div className="cell-sub">{row.channelCode}</div>}
                    </td>
                    <td>
                      <Pill tone={row.isReferralAgent ? 'violet' : 'blue'}>
                        {row.isReferralAgent ? 'Agent' : 'Member'}
                      </Pill>
                      <div className="cell-sub">L{row.level}</div>
                    </td>
                    <td>
                      {row.name}
                      <div className="cell-sub">{row.phone}</div>
                    </td>
                    <td className="t-right num">{money(row.deposited)}</td>
                    <td className="t-right num">{money(row.withdrawn)}</td>
                    <td
                      className="t-right num"
                      style={{ color: row.winLoss < 0 ? 'var(--danger, #c0392b)' : row.winLoss > 0 ? 'var(--ok, #1a7f37)' : undefined }}
                    >
                      {money(row.winLoss)}
                    </td>
                    <td className="t-right num">{row.ratePct}%</td>
                    <td className="t-right num" style={{ fontWeight: 600 }}>
                      {money(row.commission)}
                    </td>
                    <td>
                      <Pill tone={row.status === 'ACTIVE' ? 'green' : row.status === 'BANNED' ? 'red' : 'grey'}>
                        {row.status}
                      </Pill>
                    </td>
                    <td className="t-right">
                      <div className="flex gap8" style={{ justifyContent: 'flex-end' }}>
                        <Link className="btn btn-ghost btn-sm" to={`/users/${row.id}`}>
                          Open
                        </Link>
                        {row.status === 'BANNED' ? (
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={banBusyId === row.id}
                            onClick={() => void banDownlineMember(row.id, 'ACTIVE')}
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={banBusyId === row.id}
                            onClick={() => {
                              if (window.confirm(`Block Game ID ${row.gameId}?`)) {
                                void banDownlineMember(row.id, 'BANNED')
                              }
                            }}
                          >
                            Block
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {downline.length === 0 && (
                  <tr>
                    <td colSpan={10} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                      {downlineBusy ? 'Loading downline…' : 'No channel members yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isC2c && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head">
            <h3>Game play history</h3>
            <span className="muted" style={{ fontSize: 12 }}>
              Per-game stake return — Winning % + Loss % = 100% of bet (RTP if player in profit)
            </span>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Game name</th>
                  <th className="t-right">Bet</th>
                  <th className="t-right">Won</th>
                  <th className="t-right">Win/Loss</th>
                  <th className="t-right">Winning %</th>
                  <th className="t-right">Loss %</th>
                </tr>
              </thead>
              <tbody>
                {(data.gamePlayStats || []).map((g) => (
                  <tr key={g.game}>
                    <td>
                      <b>{g.gameName}</b>
                      <div className="cell-sub">{g.game}</div>
                    </td>
                    <td className="t-right num">{money(r(g.bet))}</td>
                    <td className="t-right num">{money(r(g.win))}</td>
                    <td
                      className="t-right num"
                      style={{
                        color: Number(g.winLoss) < 0 ? 'var(--red)' : Number(g.winLoss) > 0 ? 'var(--green, #1a7f37)' : undefined,
                        fontWeight: 700,
                      }}
                    >
                      {money(r(g.winLoss))}
                    </td>
                    <td className="t-right num" style={{ color: 'var(--green, #1a7f37)', fontWeight: 700 }}>
                      {g.profitable ? `${g.rtpPct}% RTP` : `${g.winningPct}%`}
                    </td>
                    <td className="t-right num" style={{ color: 'var(--red)', fontWeight: 700 }}>
                      {g.profitable ? '0%' : `${g.lossPct}%`}
                    </td>
                  </tr>
                ))}
                {(!data.gamePlayStats || data.gamePlayStats.length === 0) && (
                  <tr>
                    <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                      No game play yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isC2c && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head"><h3>Bonus / wager rows</h3></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Type</th>
                  <th className="t-right">Amount</th>
                  <th className="t-right">Progress</th>
                  <th className="t-right">Required</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.bonuses.map((b) => (
                  <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => { setWagerBonusId(b.id); setWagerOpen(true) }}>
                    <td>{b.type}<div className="cell-sub">{b.id.slice(-8)}</div></td>
                    <td className="t-right num">{money(r(b.amount))}</td>
                    <td className="t-right num">{money(r(b.wagerProgress))}</td>
                    <td className="t-right num">{money(r(b.wagerRequired))}</td>
                    <td><Pill tone={b.status === 'ACTIVE' ? 'green' : 'grey'}>{b.status}</Pill></td>
                  </tr>
                ))}
                {data.bonuses.length === 0 && (
                  <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 24 }}>No bonuses yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-2" style={{ marginTop: 18, gap: 18 }}>
        <div className="card">
          <div className="card-head"><h3>Deposits</h3></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Amount</th><th>Method</th><th>Status</th><th>Time</th></tr></thead>
              <tbody>
                {data.deposits.map((d) => (
                  <tr key={d.id}>
                    <td className="num">{money(r(d.amount))}</td>
                    <td>{d.method}</td>
                    <td>{d.status}</td>
                    <td className="muted">{String(d.createdAt).slice(0, 16).replace('T', ' ')}</td>
                  </tr>
                ))}
                {data.deposits.length === 0 && <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 20 }}>None</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Withdrawals</h3></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Amount</th><th>Method</th><th>Status</th><th>Time</th></tr></thead>
              <tbody>
                {data.withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td className="num">{money(r(w.amount))}</td>
                    <td>{w.method}</td>
                    <td>{w.status}</td>
                    <td className="muted">{String(w.createdAt).slice(0, 16).replace('T', ' ')}</td>
                  </tr>
                ))}
                {data.withdrawals.length === 0 && <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 20 }}>None</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {walletOpen && (
        <Modal
          title="Adjust balance"
          onClose={() => setWalletOpen(false)}
          foot={
            <>
              <button className="btn btn-outline" onClick={() => setWalletOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy} onClick={applyWallet}>{busy ? '…' : 'Apply'}</button>
            </>
          }
        >
          <p className="section-sub">Positive = credit, negative = deduct.</p>
          <div className="fld" style={{ marginBottom: 12 }}>
            <label>Bucket</label>
            <select value={bucket} onChange={(e) => setBucket(e.target.value as any)}>
              <option value="MAIN">MAIN (playable)</option>
              <option value="BONUS">BONUS</option>
              <option value="COMMISSION">COMMISSION</option>
            </select>
          </div>
          <div className="fld" style={{ marginBottom: 12 }}>
            <label>Amount (Rs)</label>
            <input type="number" value={walletAmt} onChange={(e) => setWalletAmt(Number(e.target.value))} />
          </div>
          <div className="fld">
            <label>Reason</label>
            <input value={walletReason} onChange={(e) => setWalletReason(e.target.value)} />
          </div>
        </Modal>
      )}

      {wagerOpen && (
        <Modal
          title="Manual wager"
          onClose={() => setWagerOpen(false)}
          foot={
            <>
              <button className="btn btn-outline" onClick={() => setWagerOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy} onClick={applyWager}>{busy ? '…' : 'Apply'}</button>
            </>
          }
        >
          <p className="section-sub">Add progress, set absolute progress, or set required wager. Amounts in Rs.</p>
          <div className="fld" style={{ marginBottom: 12 }}>
            <label>Mode</label>
            <select value={wagerMode} onChange={(e) => setWagerMode(e.target.value as any)}>
              <option value="add">Add to progress</option>
              <option value="set">Set progress</option>
              <option value="required">Set required</option>
            </select>
          </div>
          <div className="fld" style={{ marginBottom: 12 }}>
            <label>Amount (Rs)</label>
            <input type="number" value={wagerAmt} onChange={(e) => setWagerAmt(Number(e.target.value))} />
          </div>
          <div className="fld">
            <label>Bonus ID (optional — leave empty for oldest active)</label>
            <input value={wagerBonusId} onChange={(e) => setWagerBonusId(e.target.value)} placeholder="auto" />
          </div>
        </Modal>
      )}

      {mentorOpen && (
        <Modal
          title="Make Mentor"
          onClose={() => setMentorOpen(false)}
          foot={
            <>
              <button className="btn btn-outline" onClick={() => setMentorOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy} onClick={() => void submitMakeMentor()}>
                {busy ? '…' : 'Promote'}
              </button>
            </>
          }
        >
          <p className="section-sub">
            Turns this player into a Mentor with a channel for mentor.roadmaster.pro. Existing login password stays unless you set a new one.
          </p>
          <div className="fld" style={{ marginBottom: 12 }}>
            <label>Channel code</label>
            <input value={mentorChannelCode} onChange={(e) => setMentorChannelCode(e.target.value)} placeholder="m123456" />
          </div>
          <div className="fld" style={{ marginBottom: 12 }}>
            <label>Channel name</label>
            <input value={mentorChannelName} onChange={(e) => setMentorChannelName(e.target.value)} />
          </div>
          <div className="fld">
            <label>New password (optional)</label>
            <input
              type="text"
              value={mentorPassword}
              onChange={(e) => setMentorPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
            />
          </div>
        </Modal>
      )}

      {promoteCreds && (
        <Modal title="Mentor credentials" onClose={() => setPromoteCreds(null)}>
          <p className="section-sub">Save this password — shown once.</p>
          {promoteCreds.channel && (
            <div className="fld" style={{ marginBottom: 10 }}>
              <label>Channel</label>
              <div className="num" style={{ fontWeight: 800 }}>{promoteCreds.channel}</div>
            </div>
          )}
          <div className="fld">
            <label>Password</label>
            <div className="flex gap8" style={{ alignItems: 'center' }}>
              <code style={{ fontWeight: 800 }}>{promoteCreds.password}</code>
              <button className="btn btn-light btn-sm" onClick={() => navigator.clipboard?.writeText(promoteCreds.password)}>
                Copy
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
