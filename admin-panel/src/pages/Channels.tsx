import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHead, Pill, Toggle, Modal } from '../components/ui'
import { Icons } from '../components/icons'
import { api } from '../api/client'
import { useAdmin } from '../data/store'

interface Channel {
  id: string
  code: string
  name: string
  enabled: boolean
  members: number
  owner: { id: string; displayName: string; phone: string; referralCode: string }
}

export default function Channels() {
  const { agents, showToast } = useAdmin()
  const nav = useNavigate()
  const [channels, setChannels] = useState<Channel[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [ownerId, setOwnerId] = useState('')

  async function load() {
    try {
      setChannels(await api.get('/admin/channels'))
    } catch (e: any) {
      showToast(e?.message || 'Failed to load channels')
    }
  }
  useEffect(() => { load() }, [])

  async function create() {
    if (code.trim().length < 1 || name.trim().length < 1 || !ownerId) {
      showToast('Fill code, name and mentor')
      return
    }
    try {
      await api.post('/admin/channels', { code: code.trim(), name: name.trim(), ownerId })
      setShowCreate(false); setCode(''); setName(''); setOwnerId('')
      showToast('Channel created')
      load()
    } catch (e: any) {
      showToast(e?.message || 'Create failed')
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
        subtitle="Marketing channels owned by mentors. Members who join via a channel's link sit under that mentor's referral hierarchy."
        actions={<button className="btn btn-primary" onClick={() => setShowCreate(true)}>{Icons.plus} New channel</button>}
      />

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
                    <div className="cell-sub">channel={c.code}</div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 0, textAlign: 'left' }}
                      onClick={() => nav(`/users/${c.owner.id}`)}
                      title="Open mentor full profile"
                    >
                      <div className="cell-main" style={{ color: 'var(--brand)' }}>{c.owner.displayName}</div>
                      <div className="cell-sub">{c.owner.phone}</div>
                    </button>
                  </td>
                  <td><Pill tone="violet">{c.owner.referralCode}</Pill></td>
                  <td className="t-right num">{c.members}</td>
                  <td>{c.enabled ? <Pill tone="green">Enabled</Pill> : <Pill tone="grey">Off</Pill>}</td>
                  <td className="t-right">
                    <div className="flex gap8" style={{ justifyContent: 'flex-end' }}>
                      <Link className="btn btn-light btn-sm" to={`/users/${c.owner.id}`}>Open mentor</Link>
                      <Toggle on={c.enabled} onChange={() => toggle(c)} />
                      <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {channels.length === 0 && (
                <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 30 }}>No channels yet. Create one and assign a mentor.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <Modal
          title="Create channel"
          onClose={() => setShowCreate(false)}
          foot={<>
            <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={create}>Create</button>
          </>}
        >
          <p className="section-sub">Members joining via <code>?channel={code || 'CODE'}&shareCode=…</code> are grouped under this mentor.</p>
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
              <option value="">Select an agent…</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.phone}</option>)}
            </select>
          </div>
        </Modal>
      )}
    </>
  )
}
