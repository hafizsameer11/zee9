import S9ModalShell from './S9ModalShell'
import ps from '../../../styles/premiumScreen.module.css'
import styles from './MailScreen.module.css'
import type { Notif } from '../../../api/hooks'

type Props = { onClose: () => void; items?: Notif[] }

const ICON: Record<string, string> = { deposit: '💰', withdrawal: '🏦', bonus: '🎁', commission: '🤝', wheel: '🎡', system: '✉️' }

function timeAgo(iso: string) {
  const d = new Date(iso)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'Now'
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.floor(mins / 60)}h`
  return d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })
}

export default function MailScreen({ onClose, items = [] }: Props) {
  return (
    <S9ModalShell title="Notifications" onClose={onClose} wide hideSupport>
      {items.length === 0 && (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#c9a24a', fontSize: 13 }}>No notifications yet</div>
      )}
      {items.map((m) => (
        <button key={m.id} type="button" className={`${ps.listItem} ${!m.read ? styles.unread : ''}`}>
          <span className={ps.listIcon}>{ICON[m.kind] ?? '✉️'}</span>
          <span className={ps.listText}>
            <strong>{m.title}</strong>
            <small>{m.body}</small>
          </span>
          <span className={styles.date}>{timeAgo(m.createdAt)}</span>
          {!m.read && <span className={styles.dot} />}
        </button>
      ))}
    </S9ModalShell>
  )
}
