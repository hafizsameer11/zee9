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
    referralCode: string
    referredById: string | null
    agentActive: boolean
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

  const [walletOpen, setWalletOpen] = useState(false)
  const [bucket, setBucket] = useState<'MAIN' | 'BONUS' | 'COMMISSION'>('MAIN')
  const [walletAmt, setWalletAmt] = useState(0)
  const [walletReason, setWalletReason] = useState('Admin adjust')

  const [wagerOpen, setWagerOpen] = useState(false)
  const [wagerMode, setWagerMode] = useState<'add' | 'set' | 'required'>('add')
  const [wagerAmt, setWagerAmt] = useState(0)
  const [wagerBonusId, setWagerBonusId] = useState('')

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

  async function saveProfile() {
    if (!id) return
    setBusy(true)
    try {
      await api.patch(`/admin/users/${id}`, {
        displayName: name.trim(),
        phone: phone.trim(),
        vipLevel: vip,
        channelCode: channelCode.trim() || null,
        bindCode: bindCode.trim() || null,
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

  async function setStatus(status: 'ACTIVE' | 'BANNED') {
    if (!id) return
    await api.post(`/admin/users/${id}/status`, { status })
    showToast(status === 'BANNED' ? 'Banned' : 'Activated')
    load()
  }

  async function setRole(role: 'PLAYER' | 'AGENT') {
    if (!id) return
    setBusy(true)
    try {
      await api.post(`/admin/users/${id}/role`, { role })
      if (role === 'AGENT') {
        await api.patch(`/admin/users/${id}`, { agentActive: true })
      }
      showToast(`Role set to ${role}`)
      await load()
      reset()
    } catch (e: any) {
      showToast(e?.message || 'Role change failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleAgentActive() {
    if (!id || !data) return
    await api.patch(`/admin/users/${id}`, { agentActive: !data.user.agentActive })
    showToast('Agent active updated')
    load()
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
  const isMentor = u.role === 'AGENT' || (data.channels?.length ?? 0) > 0
  const title = isMentor ? `Mentor / Agent — ${u.displayName}` : `Player — ${u.displayName}`

  return (
    <>
      <PageHead
        title={title}
        subtitle={`Game ID ${u.gameId || u.id.slice(-8)} · ${u.phone}`}
        actions={
          <div className="flex gap8">
            <Link className="btn btn-outline" to="/players">Players</Link>
            <Link className="btn btn-outline" to="/channels">Channels</Link>
            <button className="btn btn-outline" onClick={() => nav(-1)}>Back</button>
          </div>
        }
      />

      <div className="grid grid-2" style={{ gridTemplateColumns: '1.1fr 1fr', alignItems: 'start', gap: 18 }}>
        <div className="card card-pad">
          <h3 className="section-title">Profile</h3>
          <p className="section-sub">Edit any field and save. Full admin control.</p>
          <div className="form-grid">
            <div className="fld">
              <label>Display name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="fld">
              <label>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="fld">
              <label>VIP level</label>
              <input type="number" value={vip} onChange={(e) => setVip(Number(e.target.value))} />
            </div>
            <div className="fld">
              <label>Game ID</label>
              <input value={u.gameId || u.id.slice(-8)} readOnly />
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
          </div>
          <div className="flex gap8" style={{ marginTop: 16, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={busy} onClick={saveProfile}>{busy ? '…' : 'Save profile'}</button>
            {u.status === 'ACTIVE' ? (
              <button className="btn btn-danger" onClick={() => setStatus('BANNED')}>Ban</button>
            ) : (
              <button className="btn btn-success" onClick={() => setStatus('ACTIVE')}>Unban</button>
            )}
            {u.role === 'PLAYER' ? (
              <button className="btn btn-light" disabled={busy} onClick={() => setRole('AGENT')}>Make agent / mentor</button>
            ) : (
              <button className="btn btn-light" disabled={busy} onClick={() => setRole('PLAYER')}>Demote to player</button>
            )}
            {u.role === 'AGENT' && (
              <button className="btn btn-light" onClick={toggleAgentActive}>
                Agent {u.agentActive ? 'Active → Off' : 'Off → Active'}
              </button>
            )}
          </div>
          <div style={{ marginTop: 12 }} className="muted">
            Role: <Pill tone="violet">{u.role}</Pill>{' '}
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
            Referrals: {data.directReferrals} · Commission earned: {money(r(data.commissionEarned))} ·
            Total wagered: {money(r(data.wagerSummary?.totalBet))} ({data.wagerSummary?.rounds ?? 0} rounds)
          </p>
          <div className="flex gap8" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => setWalletOpen(true)}>Adjust balance</button>
            <button className="btn btn-outline" onClick={() => setWagerOpen(true)}>Set / add wager</button>
          </div>
        </div>
      </div>

      {(data.accounts?.length > 0 || data.channels?.length > 0) && (
        <div className="grid grid-2" style={{ marginTop: 18, gap: 18 }}>
          {data.accounts?.length > 0 && (
            <div className="card">
              <div className="card-head"><h3>Collection numbers</h3></div>
              <div className="table-wrap">
                <table className="tbl">
                  <thead><tr><th>Method</th><th>Number</th><th>Holder</th><th>Active</th></tr></thead>
                  <tbody>
                    {data.accounts.map((a) => (
                      <tr key={a.id}>
                        <td>{a.method}</td>
                        <td className="num">{a.number}</td>
                        <td>{a.holder}</td>
                        <td>{a.enabled ? <Pill tone="green">On</Pill> : <Pill tone="grey">Off</Pill>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {data.channels?.length > 0 && (
            <div className="card">
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
        </div>
      )}

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
    </>
  )
}
