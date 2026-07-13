import { useEffect, useState } from 'react'
import { PageHead, Pill, Toggle } from '../components/ui'
import { Icons } from '../components/icons'
import { api } from '../api/client'
import { useAdmin } from '../data/store'
import { money } from '../components/ui'

interface Channel {
  id: string
  method: string
  accountNumber: string
  accountTitle: string
  bankName?: string
  instructions?: string
  enabled: boolean
  minAmount: number
  maxAmount: number
  priority: number
}

const METHODS = ['JAZZCASH', 'EASYPAISA', 'BANK'] as const

export default function PaymentChannels() {
  const { showToast } = useAdmin()
  const [channels, setChannels] = useState<Channel[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ method: 'JAZZCASH' as typeof METHODS[number], accountNumber: '', accountTitle: '', bankName: '', minAmount: 300, maxAmount: 100000 })

  async function load() {
    try {
      const rows = await api.get('/admin/payment-channels')
      setChannels(rows.map((c: any) => ({
        id: c.id,
        method: c.method,
        accountNumber: c.accountNumber,
        accountTitle: c.accountTitle,
        bankName: c.bankName,
        instructions: c.instructions,
        enabled: c.enabled,
        minAmount: Number(c.minAmount) / 100,
        maxAmount: Number(c.maxAmount) / 100,
        priority: c.priority,
      })))
    } catch (e: any) {
      showToast(e?.message || 'Failed to load channels')
    }
  }

  useEffect(() => { load() }, [])

  async function create() {
    if (!form.accountNumber.trim() || !form.accountTitle.trim()) return showToast('Fill account number and title')
    try {
      await api.post('/admin/payment-channels', form)
      setShowCreate(false)
      showToast('Channel created')
      load()
    } catch (e: any) {
      showToast(e?.message || 'Create failed')
    }
  }

  async function toggle(c: Channel) {
    try {
      await api.patch(`/admin/payment-channels/${c.id}`, { enabled: !c.enabled })
      load()
    } catch (e: any) {
      showToast(e?.message || 'Update failed')
    }
  }

  async function remove(c: Channel) {
    try {
      await api.del(`/admin/payment-channels/${c.id}`)
      showToast('Channel removed')
      load()
    } catch (e: any) {
      showToast(e?.message || 'Delete failed')
    }
  }

  return (
    <>
      <PageHead
        title="Payment Channels"
        subtitle="Deposit accounts shown to players in Add Cash"
        actions={<button className="btn btn-primary" onClick={() => setShowCreate(true)}>{Icons.plus} Add channel</button>}
      />

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Method</th>
                <th>Account</th>
                <th>Title</th>
                <th>Limits</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.id}>
                  <td><Pill tone="violet">{c.method}</Pill></td>
                  <td className="cell-main">{c.accountNumber}</td>
                  <td>{c.accountTitle}</td>
                  <td>{money(c.minAmount)} – {money(c.maxAmount)}</td>
                  <td><Toggle on={c.enabled} onChange={() => toggle(c)} /></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => remove(c)}>Delete</button></td>
                </tr>
              ))}
              {channels.length === 0 && (
                <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 30 }}>No payment channels — players cannot deposit</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add payment channel</h3>
            <div className="fld"><label>Method</label>
              <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as any })}>
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="fld"><label>Account number</label><input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} /></div>
            <div className="fld"><label>Account title</label><input value={form.accountTitle} onChange={(e) => setForm({ ...form, accountTitle: e.target.value })} /></div>
            {form.method === 'BANK' && <div className="fld"><label>Bank name</label><input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={create}>Create</button>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
