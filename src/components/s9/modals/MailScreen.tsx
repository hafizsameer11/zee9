import S9ModalShell from './S9ModalShell'
import ps from '../../../styles/premiumScreen.module.css'
import styles from './MailScreen.module.css'

type Props = { onClose: () => void }

const MESSAGES = [
  { title: 'Welcome to Zee9!', preview: 'Get 100% bonus on your first deposit...', date: 'Today', unread: true },
  { title: 'Deposit Successful', preview: 'Your deposit of Rs 500 has been credited.', date: 'Yesterday', unread: true },
  { title: 'VIP Upgrade Available', preview: 'Deposit more to unlock VIP Level 1 rewards.', date: 'Jun 14', unread: false },
  { title: 'Weekly Cashback', preview: 'You earned Rs 0 cashback this week.', date: 'Jun 10', unread: false },
]

export default function MailScreen({ onClose }: Props) {
  return (
    <S9ModalShell title="Mail" onClose={onClose} wide hideSupport>
      {MESSAGES.map((m) => (
        <button
          key={m.title}
          type="button"
          className={`${ps.listItem} ${m.unread ? styles.unread : ''}`}
        >
          <span className={ps.listIcon}>✉️</span>
          <span className={ps.listText}>
            <strong>{m.title}</strong>
            <small>{m.preview}</small>
          </span>
          <span className={styles.date}>{m.date}</span>
          {m.unread && <span className={styles.dot} />}
        </button>
      ))}
    </S9ModalShell>
  )
}
