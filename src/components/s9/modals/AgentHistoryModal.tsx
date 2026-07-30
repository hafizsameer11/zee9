import { useEffect, useState } from 'react'
import { api } from '../../../api/client'
import styles from './AgentHistoryModal.module.css'

type Row = {
  id: string
  level?: number
  amount: number
  status?: string
  at?: string
  time?: string
  source?: string
  from?: string
  tips?: string
}

type Props = { onClose: () => void }

function fmtDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${dd}-${mm} ${hh}:${mi}:${ss}`
}

function fmtAmt(n: number) {
  const abs = Math.abs(n).toLocaleString('en-PK', {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })
  if (n > 0) return abs
  if (n < 0) return `-${abs}`
  return abs
}

export default function AgentHistoryModal({ onClose }: Props) {
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const rows = await api.get('/referral-agent/commissions')
        if (Array.isArray(rows)) {
          setItems(
            rows.map((r: any) => ({
              id: r.id,
              amount: Number(r.amount) || 0,
              at: r.at,
              source: r.source,
              level: r.level,
              tips: r.source ? `L${r.level ?? ''} · ${r.source}` : '',
            })),
          )
          return
        }
      } catch {
        /* fallback */
      }
      try {
        const d = await api.get('/referrals/earnings')
        setItems(
          (d.items || []).map((e: any) => ({
            id: e.id,
            amount: Number(e.amount) || 0,
            at: e.time,
            source: e.from,
            level: e.level,
            tips: e.from ? `L${e.level ?? ''} · ${e.from}` : '',
          })),
        )
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    })().finally(() => setLoading(false))
  }, [])

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        <header className={styles.head}>
          <h2>HISTORY</h2>
        </header>

        <div className={styles.body}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Account change type</th>
                <th>Account change amount</th>
                <th>Tips</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className={styles.empty}>
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.empty}>
                    No history yet
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.at || r.time)}</td>
                    <td>commission</td>
                    <td className={r.amount >= 0 ? styles.pos : styles.neg}>{fmtAmt(r.amount)}</td>
                    <td className={styles.tips}>{r.tips || ''}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <button type="button" className={styles.closeX} onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
    </div>
  )
}
