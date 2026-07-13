import { useState } from 'react'
import S9ModalShell from './S9ModalShell'
import styles from './BindWithdrawModal.module.css'
import base from './modal.module.css'
import type { PayoutAccount, PayoutMethod } from '../../../api/payoutAccount'

type Props = {
  onClose: () => void
  onConfirm: (account: PayoutAccount) => void
  initial?: PayoutAccount | null
}

export default function BindWithdrawModal({ onClose, onConfirm, initial }: Props) {
  const [method, setMethod] = useState<PayoutMethod>(initial?.method ?? 'JAZZCASH')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [phone, setPhone] = useState(initial?.number?.replace(/^03/, '') ?? '')
  const [bank, setBank] = useState(initial?.bank ?? '')
  const [err, setErr] = useState('')

  function submit() {
    setErr('')
    if (title.trim().length < 2) return setErr('Enter payee name')
    if (method === 'BANK') {
      if (bank.trim().length < 2) return setErr('Enter bank name')
      if (phone.trim().length < 5) return setErr('Enter account number')
      onConfirm({ method, title: title.trim(), number: phone.trim(), bank: bank.trim() })
      return
    }
    if (phone.trim().length !== 9) return setErr('Enter 9-digit phone number')
    onConfirm({ method, title: title.trim(), number: `03${phone.trim()}` })
  }

  return (
    <S9ModalShell title="Bind Withdrawal Account" onClose={onClose} wide hideSupport>
      <div className={styles.layout}>
        <div className={styles.tabs}>
          <button type="button" className={method === 'JAZZCASH' ? styles.tabOn : styles.tab} onClick={() => setMethod('JAZZCASH')}>Jazz Cash</button>
          <button type="button" className={method === 'EASYPAISA' ? styles.tabOn : styles.tab} onClick={() => setMethod('EASYPAISA')}>Easypaisa</button>
          <button type="button" className={method === 'BANK' ? styles.tabOn : styles.tab} onClick={() => setMethod('BANK')}>Bank</button>
          <button type="button" className={method === 'WEGARS' ? styles.tabOn : styles.tab} onClick={() => setMethod('WEGARS')}>Wegars</button>
        </div>

        <div className={styles.form}>
          {err && <p style={{ color: '#ef5350', fontSize: 12, margin: '0 0 8px' }}>{err}</p>}
          <div className={base.inputRow}>
            <span className={base.inputIcon}>👤</span>
            <input className={base.input} type="text" placeholder="Payee Name" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {method === 'BANK' ? (
            <>
              <div className={base.inputRow}>
                <span className={base.inputIcon}>🏛</span>
                <input className={base.input} type="text" placeholder="Bank name" value={bank} onChange={(e) => setBank(e.target.value)} />
              </div>
              <div className={base.inputRow}>
                <span className={base.inputIcon}>#</span>
                <input className={base.input} type="text" placeholder="Account / IBAN number" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </>
          ) : (
            <div className={styles.accountRow}>
              <span className={styles.methodLabel}>
                {method === 'JAZZCASH' ? 'JAZZ\nCASH' : method === 'EASYPAISA' ? 'EASY\nPAISA' : 'WEGARS'}
              </span>
              <div className={styles.phoneInput}>
                <span className={styles.prefix}>03</span>
                <input type="tel" placeholder="The next 9 digits" maxLength={9} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
          )}

          <button type="button" className={base.confirmBtn} onClick={submit}>Confirm</button>
        </div>
      </div>
    </S9ModalShell>
  )
}
