import type { S9Category } from '../../data/s9Games'
import { getDevelopedSidebarCategories } from '../../data/s9Games'
import { SidebarIcon } from './S9Icons'
import styles from './S9Sidebar.module.css'

type Props = {
  active: S9Category
  onSelect: (c: S9Category) => void
}

export default function S9Sidebar({ active, onSelect }: Props) {
  const items = getDevelopedSidebarCategories()

  return (
    <nav className={styles.sidebar}>
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={`${styles.item} ${active === item.id ? styles.active : ''}`}
          onClick={() => onSelect(item.id)}
          style={{ animationDelay: `${index * 0.12}s` }}
        >
          <span className={styles.iconWrap}>
            <SidebarIcon name={item.id} size={14} />
          </span>
          <span className={styles.label}>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
