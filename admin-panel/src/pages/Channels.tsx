import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead, Pill, Toggle, Modal, money } from '../components/ui'
import { Icons } from '../components/icons'
import { api } from '../api/client'
import { useAdmin } from '../data/store'
import { CredsModal } from '../components/CredsModal'
import type { AgentCreds } from '../data/store'

interface Channel {
  id: string
  code: string
  name: string
  enabled: boolean
  members: number
  owner: { id: string; displayName: string; phone: string; referralCode: string }
}

interface MentorRow {
  id: string
  displayName: string
  phone: string
  playerNo: number | null
  referralCode: string
  status: string
  commission: number
  commissionBalance: number
  channels: Array<{ id: string; code: string; name: string; enabled: boolean }>
}

export default function Channels() {
  const { showToast } = useAdmin()
  const [channels, setChannels] = useState<Channel[]>([])
  const [mentors, setMentors] = useState<MentorRow[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showMentor, setShowMentor] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [mPhone, setMPhone] = useState('')
  const [mName, setMName] = useState('')
  const [mCode, setMCode] = useState('')
  const [mChannelName, setMChannelName] = useState('')
  const [mPassword, setMPassword] = useState('')
  const [resetTarget, setResetTarget] = useState<MentorRow | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [creds, setCreds] = useState<AgentCreds | null>(null)
  const [busy, setBusy] = useState(false)
  const [mentorQ, setMentorQ] = useState('')

  async function load() {
    try {
      const [ch, m] = await Promise.all([api.get('/admin/channels'), api.get('/admin/mentors')])
      setChannels(ch)
      setMentors(
        (m as any[]).map((row) => ({
          ...row,
          playerNo: row.playerNo != null ? Number(row.playerNo) : null,
          commission: Number(row.commission) / 100,
          commissionBalance: Number(row.commissionBalance) / 100,
        })),
      )
    } catch (e: any) {
      showToast(e?.message || 'Failed to load channels')
    }
  }
  useEffect(() => {
    void load()
  }, [])

  async function create() {
    if (code.trim().length < 1 || name.trim().length < 1 || !ownerId) {
      showToast('Fill code, name and mentor')
      return
    }
    try {
      await api.post('/admin/channels', { code: code.trim(), name: name.trim(), ownerId })
      setShowCreate(false)
      setCode('')
      setName('')
      setOwnerId('')
      showToast('Channel created')
      load()
    } catch (e: any) {
      showToast(e?.message || 'Create failed')
    }
  }

  async function createMentor() {
    if (mPhone.trim().length < 7 || mName.trim().length < 2 || mCode.trim().length < 1) {
      showToast('Fill mentor phone, name and channel code')
      return
    }
    setBusy(true)
    try {
      const body: Record<string, string> = {
        phone: mPhone.trim(),
        displayName: mName.trim(),
        channelCode: mCode.trim(),
        channelName: mChannelName.trim() || `Channel ${mCode.trim()}`,
      }
      if (mPassword.trim().length >= 6) body.password = mPassword.trim()
      const c = await api.post('/admin/mentors', body)
      setShowMentor(false)
      setMPhone('')
      setMName('')
      setMCode('')
      setMChannelName('')
      setMPassword('')
      setCreds({
        id: c.id,
        phone: c.phone,
        password: c.password,
        referralCode: c.referralCode,
        displayName: c.displayName,
      })
      load()
    } catch (e: any) {
      showToast(e?.message || 'Create mentor failed')
    } finally {
      setBusy(false)
    }
  }

  async function submitResetPw() {
    if (!resetTarget) return
    if (resetPassword.trim() && resetPassword.trim().length < 6) {
      showToast('Password must be at least 6 characters')
      return
    }
    setBusy(true)
    try {
      const body = resetPassword.trim() ? { password: resetPassword.trim() } : {}
      const c = await api.post(`/admin/mentors/${resetTarget.id}/reset-password`, body)
      setResetTarget(null)
      setResetPassword('')
      setCreds({
        id: c.id,
        phone: c.phone,
        password: c.password,
        referralCode: c.referralCode || '',
        displayName: c.displayName,
      })
    } catch (e: any) {
      showToast(e?.message || 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggle(c: Channel) {
    await api.patch(`/admin/channels/${c.id}`, { enabled: !c.enabled }).catch(() => {})
    load()
  }
  async function remove(c: Channel) {
    await api.del(`/admin/channels/${c.id}`).catch((e: any) => showToast(e?.message || 'Delete failed'))
    load()
  }

  return (
    <>
      <PageHead
        title="Channels & Mentors"
        subtitle="Create mentors with a channel, or assign an existing mentor as channel owner."
        actions={
          <div className="flex gap8">
            <button className="btn btn-outline" onClick={() => setShowMentor(true)}>
              {Icons.plus} New mentor
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              {Icons.plus} New channel
            </button>
          </div>
        }
      />

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-pad" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0 }}>Mentors</h3>
            <p className="section-sub">Mentor panel login · one channel each by default</p>
          </div>
          <input
            type="search"
            placeholder="Search Game ID, name, phone…"
            value={mentorQ}
            onChange={(e) => setMentorQ(e.target.value)}
            style={{ minWidth: 240, padding: '8px 12px' }}
          />
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Mentor</th>
                <th>Game ID</th>
                <th>Channels</th>
                <th className="t-right">Commission</th>
                <th className="t-right">Unpaid</th>
                <th className="t-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mentors
                .filter((m) => {
                  const needle = mentorQ.trim().toLowerCase()
                  if (!needle) return true
                  return [m.displayName, m.phone, m.playerNo != null ? String(m.playerNo) : '', m.referralCode]
                    .join(' ')
                    .toLowerCase()
                    .includes(needle)
                })
                .map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="cell-main">{m.displayName}</div>
                    <div className="cell-sub">
                      {m.phone} · {m.referralCode}
                    </div>
                  </td>
                  <td className="num" style={{ fontWeight: 800 }}>
                    {m.playerNo ?? '—'}
                  </td>
                  <td>
                    {m.channels.map((c) => (
                      <Pill key={c.id} tone={c.enabled ? 'green' : 'grey'}>
                        {c.code}
                      </Pill>
                    ))}
                    {m.channels.length === 0 && <span className="muted">—</span>}
                  </td>
                  <td className="t-right num">{money(m.commission)}</td>
                  <td className="t-right num">{money(m.commissionBalance)}</td>
                  <td className="t-right">
                    <div className="flex gap8" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-light btn-sm" onClick={() => { setResetTarget(m); setResetPassword('') }}>
                        Reset password
                      </button>
                      <Link className="btn btn-ghost btn-sm" to={`/users/${m.id}`}>
                        Profile
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {mentors.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted" style={{ padding: 20 }}>
                    No mentors yet. Create one to issue mentor-panel credentials.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Mentor (owner)</th>
                <th>Share code</th>
                <th className="t-right">Members</th>
                <th>Status</th>
                <th className="t-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="cell-main">{c.name}</div>
                    <div className="cell-sub">{c.code}</div>
                  </td>
                  <td>
                    <div className="cell-main">{c.owner.displayName}</div>
                    <div className="cell-sub">{c.owner.phone}</div>
                  </td>
                  <td className="num">{c.owner.referralCode}</td>
                  <td className="t-right num">{c.members}</td>
                  <td>
                    <Toggle on={c.enabled} onChange={() => toggle(c)} />
                  </td>
                  <td className="t-right">
                    <button className="btn btn-outline btn-sm" onClick={() => remove(c)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <Modal
          title="Create channel"
          onClose={() => setShowCreate(false)}
          foot={
            <>
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={create}>
                Create
              </button>
            </>
          }
        >
          <p className="section-sub">
            Members joining via <code>?channel={code || 'CODE'}</code> are grouped under this mentor.
          </p>
          <div className="form-grid">
            <div className="fld">
              <label>Channel code</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 14" />
            </div>
            <div className="fld">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mentor Line 14" />
            </div>
          </div>
          <div className="fld" style={{ marginTop: 12 }}>
            <label>Mentor (owner)</label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">Select a mentor…</option>
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} · {m.phone}
                </option>
              ))}
            </select>
          </div>
        </Modal>
      )}

      {showMentor && (
        <Modal
          title="Create mentor"
          onClose={() => setShowMentor(false)}
          foot={
            <>
              <button className="btn btn-outline" onClick={() => setShowMentor(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={busy} onClick={createMentor}>
                Create
              </button>
            </>
          }
        >
          <p className="section-sub">Creates MENTOR role + first channel. Login for mentor.roadmaster.pro.</p>
          <div className="form-grid">
            <div className="fld">
              <label>Phone</label>
              <input value={mPhone} onChange={(e) => setMPhone(e.target.value)} placeholder="03…" />
            </div>
            <div className="fld">
              <label>Display name</label>
              <input value={mName} onChange={(e) => setMName(e.target.value)} />
            </div>
            <div className="fld">
              <label>Channel code</label>
              <input value={mCode} onChange={(e) => setMCode(e.target.value)} placeholder="ch1" />
            </div>
            <div className="fld">
              <label>Channel name</label>
              <input value={mChannelName} onChange={(e) => setMChannelName(e.target.value)} placeholder="Channel 1" />
            </div>
            <div className="fld" style={{ gridColumn: '1 / -1' }}>
              <label>Password (optional)</label>
              <input
                type="text"
                value={mPassword}
                onChange={(e) => setMPassword(e.target.value)}
                placeholder="Leave blank to auto-generate"
              />
            </div>
          </div>
        </Modal>
      )}

      {resetTarget && (
        <Modal
          title={`Reset password — ${resetTarget.displayName}`}
          onClose={() => { setResetTarget(null); setResetPassword('') }}
          foot={
            <>
              <button className="btn btn-outline" onClick={() => { setResetTarget(null); setResetPassword('') }}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={busy} onClick={() => void submitResetPw()}>
                {busy ? '…' : 'Set password'}
              </button>
            </>
          }
        >
          <p className="section-sub">
            Enter the password you want. It will be saved exactly — leave blank only if you want auto-generate.
          </p>
          <div className="fld">
            <label>New password</label>
            <input
              type="text"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Min 6 characters"
              autoFocus
            />
          </div>
        </Modal>
      )}

      {creds && <CredsModal creds={creds} onClose={() => setCreds(null)} />}
    </>
  )
}
