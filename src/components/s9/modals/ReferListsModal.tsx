import styles from './ReferListsModal.module.css'

type Props = { onClose: () => void }

const COLUMNS = ['Nickname', 'Regdate', 'All Rollover', 'Last Seen', 'Status']

export default function ReferListsModal({ onClose }: Props) {
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
            <strong>0</strong>
          </div>
          <div className={styles.stat}>
            <span>Valid Referrals</span>
            <strong>0</strong>
          </div>
          <div className={styles.stat}>
            <span>Rollover</span>
            <strong>0</strong>
          </div>
          <div className={styles.stat}>
            <span>Total Reward</span>
            <strong>0</strong>
          </div>
        </div>

        <div className={styles.colHead}>
          {COLUMNS.map((col) => (
            <span key={col}>{col}</span>
          ))}
        </div>

        <div className={styles.body}>
          {/* Empty list — demo */}
        </div>

        <div className={styles.footer} />
      </div>
    </div>
  )
}
