import S9ModalShell from './S9ModalShell'
import styles from './SupportScreen.module.css'

type Props = { onClose: () => void }

const GAME_ID = '9703040'

const FAQ = [
  { icon: '💰', label: 'Deposit Help' },
  { icon: '💳', label: 'Withdraw Help' },
  { icon: '🔐', label: 'OTP and Password help' },
  { icon: '🎁', label: 'Bonus Help' },
  { icon: '👥', label: 'Invite Friends' },
]

export default function SupportScreen({ onClose }: Props) {
  const copyId = () => {
    navigator.clipboard?.writeText(GAME_ID)
  }

  return (
    <S9ModalShell title="Help & Support" onClose={onClose} wide hideSupport bodyClassName={styles.bodyPad}>
      <div className={styles.layout}>
        <section className={styles.faq}>
          <h3 className={styles.sectionTitle}>FAQ</h3>
          <nav>
            {FAQ.map((item) => (
              <button key={item.label} type="button" className={styles.faqItem}>
                <span className={styles.faqIcon}>{item.icon}</span>
                <span className={styles.faqLabel}>{item.label}</span>
                <span className={styles.faqArrow}>›</span>
              </button>
            ))}
          </nav>
        </section>

        <section className={styles.service}>
          <h3 className={styles.sectionTitle}>Online Service</h3>
          <p className={styles.serviceText}>
            Our customer service is available 24 hours a day, 7 days a week.
            Contact us through any of the channels below for quick assistance.
          </p>

          <div className={styles.contactRow}>
            <button type="button" className={`${styles.contactBtn} ${styles.whatsapp}`}>
              <span>💬</span>
              <small>WhatsApp</small>
            </button>
            <button type="button" className={`${styles.contactBtn} ${styles.live}`}>
              <span>🎧</span>
              <small>Live Chat</small>
            </button>
            <button type="button" className={`${styles.contactBtn} ${styles.telegram}`}>
              <span>✈️</span>
              <small>Telegram</small>
            </button>
          </div>

          <button type="button" className={styles.facebookBtn}>
            <span className={styles.fbIcon}>f</span>
            Facebook
          </button>
        </section>
      </div>

      <footer className={styles.footer}>
        <span className={styles.gameId}>My Game ID: {GAME_ID}</span>
        <button type="button" className={styles.copyBtn} onClick={copyId}>COPY</button>
      </footer>
    </S9ModalShell>
  )
}
