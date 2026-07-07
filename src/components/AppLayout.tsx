import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  return (
    <div className={styles.layout}>
      <div className={styles.body}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
