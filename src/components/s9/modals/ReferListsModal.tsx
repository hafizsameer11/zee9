import styles from './ReferListsModal.module.css'

type Referral = { name: string; phone: string; joined: string }

type Props = {
  onClose: () => void
  referrals: Referral[]
  totalCommission: number
}

const COLUMNS = ['Nickname', 'Phone', 'Joined', 'Status']

export default function ReferListsModal({ onClose, referrals, totalCommission }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className={styles.header}>
          <h2>LISTS</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className={styles.summary}>
          <div className={styles.stat}>
            <span>All Referrals</span>
            <strong>{referrals.length}</strong>
          </div>
          <div className={styles.stat}>
            <span>Valid Referrals</span>
            <strong>{referrals.length}</strong>
          </div>
          <div className={styles.stat}>
            <span>Total Reward</span>
            <strong>Rs {(totalCommission / 100).toLocaleString('en-PK')}</strong>
          </div>
        </div>

        <div className={styles.colHead}>
          {COLUMNS.map((col) => (
            <span key={col}>{col}</span>
          ))}
        </div>

        <div className={styles.body}>
          {referrals.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#c9a24a', padding: 24, fontSize: 13 }}>No referrals yet — share your link to invite friends.</p>
          ) : (
            referrals.map((r) => (
              <div key={r.phone} className={styles.colHead} style={{ borderBottom: '1px solid rgba(139,105,20,.2)', padding: '8px 0' }}>
                <span>{r.name}</span>
                <span>{r.phone}</span>
                <span>{new Date(r.joined).toLocaleDateString('en-PK')}</span>
                <span>Active</span>
              </div>
            ))
          )}
        </div>

        <div className={styles.footer} />
      </div>
    </div>
  )
}
