import styles from './Header.module.css'

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.brandRow}>
        <img src="/logo.png" alt="" className={styles.logo} aria-hidden="true" />
        <div>
          <h1 className={styles.brand}>Zee9</h1>
          <span className={styles.badge}>VIP Member</span>
        </div>
      </div>
      <button type="button" className={styles.notifyBtn} aria-label="Notifications">
        <span className={styles.notifyDot} />
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </button>
    </header>
  )
}
