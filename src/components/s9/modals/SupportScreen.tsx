import { useState } from 'react'
import S9ModalShell from './S9ModalShell'
import { useConfig } from '../../../api/hooks'
import { usePlayerAuth } from '../../../api/auth'
import styles from './SupportScreen.module.css'

type Props = { onClose: () => void; onOpenNews?: () => void }

const FAQ = [
  { icon: '📰', label: 'News & Offers', answer: '__news__' },
  { icon: '💰', label: 'Deposit Help', answer: 'Open Add Cash, pick JazzCash or Easypaisa C2C, then follow the merchant payment page. Deposits usually credit within minutes after approval.' },
  { icon: '💳', label: 'Withdraw Help', answer: 'Bind your payout account under Profile → Bank Details, then use Withdraw. Complete deposit wager requirements before withdrawing.' },
  { icon: '🔐', label: 'OTP and Password help', answer: 'Use the phone number you registered with. If OTP fails, wait 60 seconds and request again. Contact WhatsApp support if locked out.' },
  { icon: '🎁', label: 'Bonus Help', answer: 'Daily open bonus and cashback are under Daily / Cashback. Wheel prizes credit to BONUS and may require wagering.' },
  { icon: '👥', label: 'Invite Friends', answer: 'Open Refer & Earn from the bottom bar, share your link, and earn commission when friends deposit and play.' },
]

export default function SupportScreen({ onClose, onOpenNews }: Props) {
  const config = useConfig()
  const { player } = usePlayerAuth()
  const gameId = String(player?.playerNo ?? '—')
  const [openFaq, setOpenFaq] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const waDigits = config?.whatsapp?.replace(/\D/g, '') ?? ''
  const openWhatsApp = () => {
    if (!waDigits) return
    window.open(`https://wa.me/${waDigits}`, '_blank', 'noopener,noreferrer')
  }

  const copyId = () => {
    if (!player?.playerNo) return
    navigator.clipboard?.writeText(String(player.playerNo))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <S9ModalShell title="Help & Support" onClose={onClose} wide hideSupport bodyClassName={styles.bodyPad}>
      <div className={styles.layout}>
        <section className={styles.faq}>
          <h3 className={styles.sectionTitle}>FAQ</h3>
          <nav>
            {FAQ.map((item) => {
              const open = openFaq === item.label
              return (
                <div key={item.label}>
                  <button
                    type="button"
                    className={styles.faqItem}
                    onClick={() => {
                      if (item.answer === '__news__') {
                        onClose()
                        onOpenNews?.()
                        return
                      }
                      setOpenFaq(open ? null : item.label)
                    }}
                  >
                    <span className={styles.faqIcon}>{item.icon}</span>
                    <span className={styles.faqLabel}>{item.label}</span>
                    <span className={styles.faqArrow}>{item.answer === '__news__' ? '›' : open ? '▾' : '›'}</span>
                  </button>
                  {open && item.answer !== '__news__' && (
                    <p style={{ margin: '0 12px 10px', padding: '8px 10px', fontSize: 12, color: '#e8d0a0', background: 'rgba(0,0,0,.25)', borderRadius: 8 }}>
                      {item.answer}
                    </p>
                  )}
                </div>
              )
            })}
          </nav>
        </section>

        <section className={styles.service}>
          <h3 className={styles.sectionTitle}>Online Service</h3>
          <p className={styles.serviceText}>
            Our customer service is available 24 hours a day, 7 days a week.
            Contact us through WhatsApp for the fastest help.
          </p>

          <div className={styles.contactRow}>
            <button
              type="button"
              className={`${styles.contactBtn} ${styles.whatsapp}`}
              onClick={openWhatsApp}
              disabled={!waDigits}
              title={waDigits ? 'Open WhatsApp' : 'WhatsApp not configured'}
            >
              <span>💬</span>
              <small>WhatsApp</small>
            </button>
            <button
              type="button"
              className={`${styles.contactBtn} ${styles.live}`}
              onClick={openWhatsApp}
              disabled={!waDigits}
            >
              <span>🎧</span>
              <small>Live Chat</small>
            </button>
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <span className={styles.gameId}>My Game ID: {gameId}</span>
        <button type="button" className={styles.copyBtn} onClick={copyId} disabled={!player?.playerNo}>
          {copied ? 'COPIED' : 'COPY'}
        </button>
      </footer>
    </S9ModalShell>
  )
}
