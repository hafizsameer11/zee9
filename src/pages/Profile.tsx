import { useNavigate } from 'react-router-dom'
import styles from './Profile.module.css'

const MENU_ITEMS = [
  { icon: '📋', label: 'Bet History', action: 'history' },
  { icon: '👥', label: 'My Network / Referrals', action: 'network' },
  { icon: '🎫', label: 'VIP Level', action: 'vip', badge: 'Silver' },
  { icon: '💬', label: '24/7 WhatsApp Support', action: 'support' },
  { icon: '📥', label: 'Download APK', action: 'download' },
  { icon: '⚙️', label: 'Settings', action: 'settings' },
]

export default function Profile() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.avatar}>Z</div>
        <div>
          <h1 className={styles.name}>Demo Player</h1>
          <p className={styles.id}>ID: ZEE9-88421</p>
          <span className={styles.vip}>👑 VIP Silver</span>
        </div>
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>47</span>
          <span className={styles.statLabel}>Games Played</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>12</span>
          <span className={styles.statLabel}>Referrals</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>3,450</span>
          <span className={styles.statLabel}>Total Won (PKR)</span>
        </div>
      </div>

      <nav className={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <button key={item.action} type="button" className={styles.menuItem}>
            <span className={styles.menuIcon}>{item.icon}</span>
            <span className={styles.menuLabel}>{item.label}</span>
            {item.badge && <span className={styles.menuBadge}>{item.badge}</span>}
            <span className={styles.menuArrow}>›</span>
          </button>
        ))}
      </nav>

      <button type="button" className={styles.logoutBtn} onClick={() => navigate('/login')}>
        Logout
      </button>

      <p className={styles.version}>Zee9 v1.0.0 · Demo Preview</p>
    </div>
  )
}
