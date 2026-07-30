import { useState } from 'react'
import S9ModalShell from './S9ModalShell'
import ps from '../../../styles/premiumScreen.module.css'
import styles from './MailScreen.module.css'
import type { Notif } from '../../../api/hooks'

type Props = {
  onClose: () => void
  items?: Notif[]
  onOpenDeposit?: () => void
  onOpenWithdraw?: () => void
  onOpenWheel?: () => void
  onOpenWelcome?: () => void
}

const ICON: Record<string, string> = {
  deposit: '💰',
  withdrawal: '🏦',
  bonus: '🎁',
  commission: '🤝',
  wheel: '🎡',
  system: '✉️',
}

function timeAgo(iso: string) {
  const d = new Date(iso)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'Now'
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.floor(mins / 60)}h`
  return d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })
}

export default function MailScreen({
  onClose,
  items = [],
  onOpenDeposit,
  onOpenWithdraw,
  onOpenWheel,
  onOpenWelcome,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  const goRelated = (kind: string) => {
    const k = kind.toLowerCase()
    onClose()
    if (k.includes('deposit')) onOpenDeposit?.()
    else if (k.includes('withdraw')) onOpenWithdraw?.()
    else if (k.includes('wheel')) onOpenWheel?.()
    else if (k.includes('bonus')) onOpenWelcome?.()
  }

  return (
    <S9ModalShell title="Notifications" onClose={onClose} wide hideSupport>
      {items.length === 0 && (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#c9a24a', fontSize: 13 }}>
          No notifications yet
        </div>
      )}
      {items.map((m) => {
        const expanded = openId === m.id
        return (
          <div key={m.id}>
            <button
              type="button"
              className={`${ps.listItem} ${!m.read ? styles.unread : ''}`}
              onClick={() => setOpenId(expanded ? null : m.id)}
            >
              <span className={ps.listIcon}>{ICON[m.kind] ?? '✉️'}</span>
              <span className={ps.listText}>
                <strong>{m.title}</strong>
                <small>{m.body}</small>
              </span>
              <span className={styles.date}>{timeAgo(m.createdAt)}</span>
              {!m.read && <span className={styles.dot} />}
            </button>
            {expanded && (
              <div style={{ padding: '0 16px 12px', marginTop: -4 }}>
                <p style={{ color: '#e8d0a0', fontSize: 12, margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{m.body}</p>
                <button
                  type="button"
                  onClick={() => goRelated(m.kind)}
                  style={{
                    background: '#e65100',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Open related
                </button>
              </div>
            )}
          </div>
        )
      })}
    </S9ModalShell>
  )
}
