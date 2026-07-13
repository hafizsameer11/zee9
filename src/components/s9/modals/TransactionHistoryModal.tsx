import { useEffect, useMemo, useState } from 'react'
import S9ModalShell from './S9ModalShell'
import { api } from '../../../api/client'
import styles from './TransactionHistoryModal.module.css'

type Txn = {
  id: string
  type: string
  bucket: string
  direction: string
  amount: number
  signed: number
  time: string
}

type Props = { onClose: () => void }

const TYPE_LABEL: Record<string, string> = {
  DEPOSIT: 'Deposit',
  DEPOSIT_BONUS: 'Deposit bonus',
  WITHDRAWAL_FREEZE: 'Withdrawal',
  WITHDRAWAL_PAID: 'Withdrawal paid',
  WITHDRAWAL_UNFREEZE: 'Withdrawal returned',
  BONUS_RELEASE: 'Bonus released',
  DAILY_BONUS: 'Daily bonus',
  REGISTRATION_BONUS: 'Registration bonus',
  COMMISSION: 'Commission',
  ADMIN_ADJUST: 'Adjustment',
}

export default function TransactionHistoryModal({ onClose }: Props) {
  const [rows, setRows] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/me/wallet/transactions')
      .then((list: any[]) =>
        setRows(
          list.map((t) => ({
            ...t,
            amount: Number(t.amount) / 100,
            signed: Number(t.signed) / 100,
          })),
        ),
      )
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => rows, [rows])

  return (
    <S9ModalShell title="Transaction History" onClose={onClose} wide hideSupport>
      <div className={styles.wrap}>
        {loading ? (
          <p className={styles.empty}>Loading…</p>
        ) : grouped.length === 0 ? (
          <p className={styles.empty}>No transactions yet</p>
        ) : (
          grouped.map((t) => {
            const label = TYPE_LABEL[t.type] ?? t.type.replace(/_/g, ' ')
            const positive = t.signed >= 0
            return (
              <div key={t.id} className={styles.row}>
                <div>
                  <div className={styles.label}>{label}</div>
                  <div className={styles.meta}>{t.bucket} · {new Date(t.time).toLocaleString('en-PK')}</div>
                </div>
                <div className={positive ? styles.credit : styles.debit}>
                  {positive ? '+' : ''}Rs {Math.abs(t.signed).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </S9ModalShell>
  )
}
