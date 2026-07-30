import { useEffect, useState } from 'react'
import { Modal, PageHead, Pill, Toggle, money } from '../components/ui'
import { Icons } from '../components/icons'
import { api } from '../api/client'
import { useAdmin } from '../data/store'

interface Channel {
  id: string
  method: string
  accountNumber: string
  accountTitle: string
  bankName?: string
  instructions?: string
  enabled: boolean
  agentFloat: boolean
  minAmount: number
  maxAmount: number
  priority: number
}

interface FloatTopup {
  id: string
  amount: number
  senderAccount?: string | null
  trxId?: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  user: {
    displayName: string
    phone: string
    panelId?: number | null
  }
  channel?: {
    bankName?: string | null
    accountNumber: string
    accountTitle: string
  } | null
}

export default function PaymentChannels() {
  const { showToast } = useAdmin()
  const [channels, setChannels] = useState<Channel[]>([])
  const [topups, setTopups] = useState<FloatTopup[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [form, setForm] = useState({
    accountNumber: '',
    accountTitle: '',
    bankName: '',
    instructions: '',
    minAmount: 10000,
    maxAmount: 1000000,
  })

  async function load() {
    try {
      const [rows, topupRows] = await Promise.all([
        api.get('/admin/payment-channels'),
        api.get('/admin/payment-channels/topups'),
      ])
      setChannels(
        rows.map((c: any) => ({
          id: c.id,
          method: c.method,
          accountNumber: c.accountNumber,
          accountTitle: c.accountTitle,
          bankName: c.bankName,
          instructions: c.instructions,
          enabled: c.enabled,
          agentFloat: !!c.agentFloat,
          minAmount: Number(c.minAmount) / 100,
          maxAmount: Number(c.maxAmount) / 100,
          priority: c.priority,
        })),
      )
      setTopups(topupRows as FloatTopup[])
    } catch (e: any) {
      showToast(e?.message || 'Failed to load float banks')
    }
  }

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  async function create() {
    if (!form.accountNumber.trim() || !form.accountTitle.trim()) {
      showToast('Fill account number and title')
      return
    }
    if (!form.bankName.trim()) {
      showToast('Bank name required')
      return
    }
    if (form.minAmount < 10000) {
      showToast('Minimum must be at least Rs 10,000')
      return
    }
    try {
      await api.post('/admin/payment-channels', {
        method: 'BANK',
        accountNumber: form.accountNumber.trim(),
        accountTitle: form.accountTitle.trim(),
        bankName: form.bankName.trim(),
        instructions: form.instructions.trim() || undefined,
        minAmount: form.minAmount,
        maxAmount: form.maxAmount,
        agentFloat: true,
      })
      setShowCreate(false)
      setForm({ accountNumber: '', accountTitle: '', bankName: '', instructions: '', minAmount: 10000, maxAmount: 1000000 })
      showToast('Bank account added for C2C float')
      await load()
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
      showToast('Account removed')
      load()
    } catch (e: any) {
      showToast(e?.message || 'Delete failed')
    }
  }

  async function reviewTopup(topup: FloatTopup, action: 'approve' | 'reject') {
    const message =
      action === 'approve'
        ? `Approve ${money(Number(topup.amount) / 100)} float for Panel ID #${topup.user.panelId ?? '—'}?`
        : `Reject this float top-up from Panel ID #${topup.user.panelId ?? '—'}?`
    if (!window.confirm(message)) return
    setBusyId(topup.id)
    try {
      await api.post(
        `/admin/payment-channels/topups/${topup.id}/${action}`,
        action === 'reject' ? { reason: 'Bank transfer not received' } : undefined,
      )
      showToast(action === 'approve' ? 'Float approved and credited' : 'Float top-up rejected')
      await load()
    } catch (e: any) {
      showToast(e?.message || 'Review failed')
    } finally {
      setBusyId(null)
    }
  }

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
  // Pending requests never disappear. Reviewed rows stay here for 24h, then remain in History.
  const currentTopups = topups.filter(
    (topup) => topup.status === 'PENDING' || new Date(topup.createdAt).getTime() >= oneDayAgo,
  )
  const historyTopups = topups.filter((topup) => topup.status !== 'PENDING')

  function depositTime(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('en-PK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <PageHead
        title="C2C Float Bank Accounts"
        subtitle="Merchants transfer to your bank; approve here to credit their C2C float"
        actions={
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            {Icons.plus} Add bank account
          </button>
        }
      />

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <h3>C2C merchant float top-ups</h3>
          <button className="btn btn-outline btn-sm" onClick={() => setShowHistory(true)}>
            Deposit History ({historyTopups.length})
          </button>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Panel ID</th>
                <th>Merchant</th>
                <th>Bank / Sender</th>
                <th>Transfer ID</th>
                <th className="t-right">Amount</th>
                <th>Time</th>
                <th>Status</th>
                <th className="t-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentTopups.map((topup) => (
                <tr key={topup.id}>
                  <td className="num" style={{ fontWeight: 800 }}>
                    Panel ID # {topup.user.panelId ?? '—'}
                  </td>
                  <td>
                    <b>{topup.user.displayName}</b>
                    <div className="cell-sub">{topup.user.phone}</div>
                  </td>
                  <td>
                    {topup.channel?.bankName || 'Bank'}
                    <div className="cell-sub">{topup.senderAccount || '—'}</div>
                  </td>
                  <td className="num">{topup.trxId || '—'}</td>
                  <td className="t-right num">{money(Number(topup.amount) / 100)}</td>
                  <td className="muted">
                    {depositTime(topup.createdAt)}
                  </td>
                  <td>
                    <Pill
                      tone={
                        topup.status === 'APPROVED'
                          ? 'green'
                          : topup.status === 'REJECTED'
                            ? 'red'
                            : 'gold'
                      }
                    >
                      {topup.status}
                    </Pill>
                  </td>
                  <td className="t-right">
                    {topup.status === 'PENDING' ? (
                      <div className="flex gap8" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={busyId === topup.id}
                          onClick={() => void reviewTopup(topup, 'approve')}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={busyId === topup.id}
                          onClick={() => void reviewTopup(topup, 'reject')}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="muted">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))}
              {currentTopups.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 28 }}>
                    No C2C float top-ups yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Your receiving bank accounts</h3></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Bank</th>
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
                  <td>
                    <Pill tone="violet">{c.bankName || 'BANK'}</Pill>
                  </td>
                  <td className="cell-main" style={{ fontFamily: 'monospace' }}>
                    {c.accountNumber}
                  </td>
                  <td>{c.accountTitle}</td>
                  <td>
                    {money(c.minAmount)} – {money(c.maxAmount)}
                  </td>
                  <td>
                    <Toggle on={c.enabled} onChange={() => toggle(c)} />
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => remove(c)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {channels.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 30 }}>
                    No bank accounts yet — C2C merchants cannot top up float until you add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add bank account (C2C float)</h3>
            <p className="section-sub">Merchants will send bank transfers to this account, then submit TID in C2C Balance.</p>
            <div className="fld">
              <label>Account number / IBAN</label>
              <input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
            </div>
            <div className="fld">
              <label>Account title</label>
              <input value={form.accountTitle} onChange={(e) => setForm({ ...form, accountTitle: e.target.value })} />
            </div>
            <div className="fld">
              <label>Bank name</label>
              <input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. HBL" />
            </div>
            <div className="fld">
              <label>Instructions (optional)</label>
              <input value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
            </div>
            <div className="form-grid" style={{ marginTop: 8 }}>
              <div className="fld">
                <label>Min (Rs)</label>
                <input type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: Number(e.target.value) })} />
              </div>
              <div className="fld">
                <label>Max (Rs)</label>
                <input type="number" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: Number(e.target.value) })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={create}>
                Create
              </button>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <Modal title="C2C Float Deposit History" onClose={() => setShowHistory(false)}>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Panel ID</th>
                  <th>TRX ID</th>
                  <th>Sender account</th>
                  <th className="t-right">Amount</th>
                  <th>Deposit date &amp; time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyTopups.map((topup) => (
                  <tr key={topup.id}>
                    <td className="num" style={{ fontWeight: 800 }}>
                      Panel ID # {topup.user.panelId ?? '—'}
                    </td>
                    <td className="num">{topup.trxId || '—'}</td>
                    <td className="num">{topup.senderAccount || '—'}</td>
                    <td className="t-right num">{money(Number(topup.amount) / 100)}</td>
                    <td>{depositTime(topup.createdAt)}</td>
                    <td>
                      <Pill tone={topup.status === 'APPROVED' ? 'green' : 'red'}>
                        {topup.status}
                      </Pill>
                    </td>
                  </tr>
                ))}
                {historyTopups.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                      No reviewed float deposits yet
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
