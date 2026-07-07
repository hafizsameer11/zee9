import { useState } from 'react'
import S9ModalShell from './S9ModalShell'
import styles from './AddCashModal.module.css'
import base from './modal.module.css'

type Props = { onClose: () => void }

const AMOUNTS = [{ rs: 300, bonus: 45 }]
const JAZZ_CHANNELS = [
  { id: '00', label: 'JAZZCASH00', bonus: null },
  { id: '03', label: 'JazCash03', bonus: null },
  { id: 'c2c', label: 'JazzCash(C2C)', bonus: '+3' },
]

export default function AddCashModal({ onClose }: Props) {
  const [method, setMethod] = useState<'jazz' | 'easy' | 'qr'>('jazz')
  const [channel, setChannel] = useState('00')
  const amount = AMOUNTS[0]
  const total = amount.rs + amount.bonus

  return (
    <S9ModalShell title="Add Cash" onClose={onClose} wide hideSupport>
      <p className={base.sectionTitle}><span>📋</span> Product details</p>
      <div className={styles.products}>
        <button type="button" className={styles.productActive}>
          Rs {amount.rs}
          <span className={styles.bonusTag}>+{amount.bonus}</span>
        </button>
      </div>

      <p className={base.sectionTitle}><span>💳</span> Select payment method</p>
      <div className={styles.tabs}>
        <button type="button" className={method === 'jazz' ? styles.tabOn : styles.tab} onClick={() => setMethod('jazz')}>Jazzcash</button>
        <button type="button" className={method === 'easy' ? styles.tabOn : styles.tab} onClick={() => setMethod('easy')}>Easypaisa</button>
        <button type="button" className={method === 'qr' ? styles.tabOn : styles.tab} onClick={() => setMethod('qr')}>
          QR Pay(Easy&amp;Jazz)
          <span className={styles.bonusBubble}>Bonus</span>
        </button>
      </div>

      {method === 'jazz' && (
        <div className={styles.channels}>
          {JAZZ_CHANNELS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={channel === c.id ? styles.channelOn : styles.channel}
              onClick={() => setChannel(c.id)}
            >
              {c.bonus && <span className={styles.chBonus}>{c.bonus}</span>}
              <span className={styles.chLabel}>{c.label}</span>
              <span className={styles.jazzLogo}>JazzCash</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.calc}>
          <div className={styles.calcItem}>
            <span className={styles.calcTagPurple}>Payment</span>
            <strong>{amount.rs}</strong>
          </div>
          <span className={styles.op}>+</span>
          <div className={styles.calcItem}>
            <span className={styles.calcTagGreen}>Chips</span>
            <strong>{amount.bonus}</strong>
          </div>
          <span className={styles.op}>=</span>
          <div className={styles.calcItem}>
            <span className={styles.calcTagPurple}>Total Get</span>
            <strong>{total}</strong>
          </div>
        </div>
        <button type="button" className={styles.payBtn}>Payment</button>
      </div>
    </S9ModalShell>
  )
}
