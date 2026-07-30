import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, TopBar, fmt } from '../components/ui'
import { api } from '../api/client'

type HistoryStatus = 'success' | 'fail' | 'onhold'

type HistoryRow = {
  id: string
  orderNo: string
  amount: number
  reward: number
  status: HistoryStatus
  method: string
  payeeName: string
  payeeAccount: string
  trxId: string | null
  time: string
  playerName: string
  playerNo: number | null
  holdUntilMs: number
}

const METHOD: Record<string, string> = {
  JAZZCASH: 'Jazzcash',
  EASYPAISA: 'Easypaisa',
  BANK: 'Bank',
  WEGARS: 'Wegars',
}

const HOLD_MS = 5 * 60 * 1000

function mapRow(o: any): HistoryRow {
  const start = Date.parse(o.submittedAt || o.createdAt)
  let status: HistoryStatus = 'fail'
  if (o.status === 'SUCCESS') status = 'success'
  else if (o.status === 'CHECKING' && o.trxId) status = 'onhold'
  return {
    id: o.id,
    orderNo: o.orderNo,
    amount: Number(o.amount ?? 0) / 100,
    reward: Number(o.reward ?? 0) / 100,
    status,
    method: METHOD[o.method] ?? o.method ?? '—',
    payeeName: o.payeeName ?? '',
    payeeAccount: o.collectionAccount ?? '',
    trxId: o.trxId ?? null,
    time: String(o.resolvedAt || o.submittedAt || o.createdAt).replace('T', ' ').slice(0, 19),
    playerName: o.player?.displayName ?? '',
    playerNo: o.player?.playerNo ?? null,
    holdUntilMs: Number.isFinite(start) ? start + HOLD_MS : 0,
  }
}

function mmss(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function statusLabel(s: HistoryStatus) {
  if (s === 'success') return 'Success'
  if (s === 'onhold') return 'Onhold'
  return 'Fail'
}

export default function WithdrawHistory() {
  const nav = useNavigate()
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [now, setNow] = useState(Date.now())

  const load = useCallback(async () => {
    setErr('')
    try {
      const data = await api.get('/agent/payouts/history')
      setRows((data as any[]).map(mapRow))
    } catch (e: any) {
      setErr(e?.message || 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const poll = window.setInterval(() => void load(), 15_000)
    return () => window.clearInterval(poll)
  }, [load])

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  return (
    <Shell>
      <StatusBar />
      <TopBar title="Withdraw History" onBack={() => nav('/pay-on-behalf')} face={false} />
      <div className="scroll pad">
        {loading && <div className="card empty">Loading…</div>}
        {!loading && err && <div className="card empty">{err}</div>}
        {!loading && !err && rows.length === 0 && (
          <div className="card empty">
            <div className="e-ico">&#128203;</div>
            No withdraw history yet
          </div>
        )}
        {!loading &&
          rows.map((r) => {
            const left = r.status === 'onhold' && r.holdUntilMs ? Math.max(0, Math.floor((r.holdUntilMs - now) / 1000)) : 0
            return (
              <div className="card order-card" key={r.id} style={{ marginBottom: 10 }}>
                <div className="oc-top">
                  <div className="ol-head">
                    <div className="order-no">Order No. {r.orderNo}</div>
                    {r.status === 'onhold' && <span className="ol-timer">{mmss(left)}</span>}
                  </div>
                  <div className="oc-grid">
                    <div className="oc-lines">
                      <div className="oc-line">
                        <span className="k">WITHDRAW</span>
                        <span className="v">{fmt(r.amount)}</span>
                      </div>
                      <div className="oc-line">
                        <span className="k">REWARD</span>
                        <span className="v gold">{fmt(r.reward)}</span>
                      </div>
                      <div className="oc-line">
                        <span className="k">METHOD</span>
                        <span className="v">{r.method}</span>
                      </div>
                      {(r.playerNo != null || r.playerName) && (
                        <div className="oc-line">
                          <span className="k">PLAYER</span>
                          <span className="v">
                            {r.playerNo != null ? `Game ID ${r.playerNo}` : r.playerName}
                          </span>
                        </div>
                      )}
                      {r.payeeAccount && (
                        <div className="oc-line">
                          <span className="k">PAID TO</span>
                          <span className="v">{r.payeeAccount}</span>
                        </div>
                      )}
                      {r.trxId && r.trxId !== 'CANCELLED' && !String(r.trxId).startsWith('ABNORMAL') && (
                        <div className="oc-line">
                          <span className="k">TID</span>
                          <span className="v">{r.trxId}</span>
                        </div>
                      )}
                    </div>
                    <div className="oc-actions">
                      <span className={'status ' + r.status}>{statusLabel(r.status)}</span>
                    </div>
                  </div>
                </div>
                <div className="oc-foot">
                  <span>{r.payeeName || '—'}</span>
                  <span>{r.time}</span>
                </div>
              </div>
            )
          })}
        <div style={{ height: 24 }} />
      </div>
    </Shell>
  )
}
