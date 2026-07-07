import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

const NAV_ITEMS = [
  { to: '/home', label: 'Home', icon: 'home' },
  { to: '/games', label: 'Games', icon: 'games' },
  { to: '/wallet', label: 'Wallet', icon: 'wallet' },
  { to: '/promotions', label: 'Promos', icon: 'promos' },
  { to: '/profile', label: 'Profile', icon: 'profile' },
] as const

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const color = active ? 'currentColor' : 'currentColor'
  switch (icon) {
    case 'home':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? color : 'none'} stroke={color} strokeWidth="2">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        </svg>
      )
    case 'games':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="8" cy="12" r="1.5" fill={color} />
          <circle cx="16" cy="10" r="1.5" fill={color} />
          <circle cx="14" cy="14" r="1.5" fill={color} />
        </svg>
      )
    case 'wallet':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 7v10a2 2 0 0 0 2 2h16v-5" />
          <circle cx="18" cy="14" r="2" />
        </svg>
      )
    case 'promos':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" />
          <line x1="12" y1="22" x2="12" y2="7" />
        </svg>
      )
    case 'profile':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      )
    default:
      return null
  }
}

export default function BottomNav() {
  return (
    <nav className={styles.nav}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          {({ isActive }) => (
            <>
              <NavIcon icon={item.icon} active={isActive} />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
