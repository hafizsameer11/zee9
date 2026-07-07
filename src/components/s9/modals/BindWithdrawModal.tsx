import { useState } from 'react'
import S9ModalShell from './S9ModalShell'
import styles from './BindWithdrawModal.module.css'
import base from './modal.module.css'

type Props = {
  onClose: () => void
  onConfirm: () => void
}

export default function BindWithdrawModal({ onClose, onConfirm }: Props) {
  const [method, setMethod] = useState<'jazz' | 'easy'>('jazz')

  return (
    <S9ModalShell title="Bind Withdrawal Account" onClose={onClose} wide hideSupport>
      <div className={styles.layout}>
        <div className={styles.tabs}>
          <button type="button" className={method === 'jazz' ? styles.tabOn : styles.tab} onClick={() => setMethod('jazz')}>Jazz Cash</button>
          <button type="button" className={method === 'easy' ? styles.tabOn : styles.tab} onClick={() => setMethod('easy')}>Easypaisa</button>
        </div>

        <div className={styles.form}>
          <div className={base.inputRow}>
            <span className={base.inputIcon}>👤</span>
            <input className={base.input} type="text" placeholder="Payee Name" />
          </div>

          <div className={styles.accountRow}>
            <span className={styles.methodLabel}>{method === 'jazz' ? 'JAZZ\nCASH' : 'EASY\nPAISA'}</span>
            <div className={styles.phoneInput}>
              <span className={styles.prefix}>03</span>
              <input type="tel" placeholder="The next 9 digits" maxLength={9} />
            </div>
          </div>

          <button type="button" className={base.confirmBtn} onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </S9ModalShell>
  )
}
