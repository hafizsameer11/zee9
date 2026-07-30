import { useEffect, useState } from 'react'
import { api } from '../../../api/client'
import styles from './MoneyRecordsModal.module.css'

type Kind = 'deposit' | 'withdraw'

type Props = {
  kind: Kind
  onClose: () => void
}

type Row = {
  id: string
  time: string
  product: string
  payment: string
  chips: string
  state: 'Success' | 'Fail' | 'Pending'
  stateTone: 'ok' | 'fail' | 'pending'
}

function fmtRs(paisa: number | string | bigint) {
  return (Number(paisa) / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function mapDeposit(d: any): Row {
  const amt = fmtRs(d.amount)
  const status = String(d.status || '')
  let state: Row['state'] = 'Pending'
  let stateTone: Row['stateTone'] = 'pending'
  if (status === 'APPROVED') {
    state = 'Success'
    stateTone = 'ok'
  } else if (status === 'REJECTED') {
    state = 'Fail'
    stateTone = 'fail'
  }
  return {
    id: d.id,
    time: fmtTime(d.createdAt || d.processedAt),
    product: `${amt}Chips`,
    payment: amt.replace(/,/g, ''),
    chips: amt.replace(/,/g, ''),
    state,
    stateTone,
  }
}

function mapWithdraw(w: any): Row {
  const amt = fmtRs(w.amount)
  const status = String(w.status || '')
  let state: Row['state'] = 'Pending'
  let stateTone: Row['stateTone'] = 'pending'
  if (status === 'PAID') {
    state = 'Success'
    stateTone = 'ok'
  } else if (status === 'REJECTED') {
    state = 'Fail'
    stateTone = 'fail'
  }
  return {
    id: w.id,
    time: fmtTime(w.createdAt || w.processedAt),
    product: `${amt}Chips`,
    payment: amt.replace(/,/g, ''),
    chips: amt.replace(/,/g, ''),
    state,
    stateTone,
  }
}

export default function MoneyRecordsModal({ kind, onClose }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const title = kind === 'deposit' ? 'RECHARGE RECORDS' : 'WITHDRAW RECORDS'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const path = kind === 'deposit' ? '/deposits' : '/withdrawals'
    api
      .get(path)
      .then((list: any) => {
        if (cancelled) return
        const arr = Array.isArray(list) ? list : list?.items || []
        setRows(arr.map(kind === 'deposit' ? mapDeposit : mapWithdraw))
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [kind])

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        <header className={styles.header}>
          <span className={styles.help} aria-hidden>?</span>
          <h2>{title}</h2>
          <button type="button" className={styles.closeX} onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className={styles.tableHead}>
          <span>Time</span>
          <span>Product</span>
          <span>Payment</span>
          <span>Chips</span>
          <span>State</span>
        </div>

        <div className={styles.scroll}>
          {loading ? (
            <p className={styles.empty}>Loading…</p>
          ) : rows.length === 0 ? (
            <p className={styles.empty}>No records yet</p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className={styles.row}>
                <span className={styles.time}>{r.time}</span>
                <span>{r.product}</span>
                <span>{Number(r.payment).toLocaleString('en-PK')}</span>
                <span>{Number(r.chips).toLocaleString('en-PK')}</span>
                <span className={styles[r.stateTone]}>{r.state}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
