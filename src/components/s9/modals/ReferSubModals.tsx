import S9ModalShell from './S9ModalShell'
import styles from './ReferSubModals.module.css'

const FULL_RANKING = [
  { medal: '🥇', name: 'K*****N', amount: '1283.79' },
  { medal: '🥈', name: 'P*****3', amount: '1118.1' },
  { medal: '🥉', name: 'P*****5', amount: '569.8' },
  { medal: '4', name: 'A*****2', amount: '412.5' },
  { medal: '5', name: 'S*****9', amount: '389.0' },
  { medal: '6', name: 'M*****1', amount: '301.2' },
  { medal: '7', name: 'R*****7', amount: '256.8' },
  { medal: '8', name: 'T*****4', amount: '198.4' },
]

export function ReferRankingModal({ onClose }: { onClose: () => void }) {
  return (
    <S9ModalShell title="Daily Ranking" onClose={onClose} wide>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Promoter</th>
            <th>CashBack</th>
          </tr>
        </thead>
        <tbody>
          {FULL_RANKING.map((r) => (
            <tr key={r.name}>
              <td>{r.medal}</td>
              <td>{r.name}</td>
              <td className={styles.gold}>{r.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </S9ModalShell>
  )
}

export function ReferGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <S9ModalShell title="Refer & Earn Guide" onClose={onClose} wide>
      <ol className={styles.guide}>
        <li>Share your unique referral link with friends.</li>
        <li>Friend registers and makes their first deposit.</li>
        <li>You earn cashback on their valid bets — up to 2% at LV7.</li>
        <li>Upgrade your level by getting more valid referrals.</li>
        <li>Withdraw earnings anytime from the Earnings panel.</li>
      </ol>
    </S9ModalShell>
  )
}

export function ReferDetailsModal({ onClose }: { onClose: () => void }) {
  return (
    <S9ModalShell title="Earnings Details" onClose={onClose} wide>
      <div className={styles.empty}>
        <span>📊</span>
        <p>No earnings yet</p>
        <small>Invite friends to start earning cashback rewards.</small>
      </div>
    </S9ModalShell>
  )
}

export function ShareLinkModal({ onClose }: { onClose: () => void }) {
  const link = 'https://zee9.com/ref/P9703040'

  const copy = () => {
    navigator.clipboard?.writeText(link)
  }

  return (
    <S9ModalShell title="Share & Copy Link" onClose={onClose}>
      <div className={styles.share}>
        <p className={styles.link}>{link}</p>
        <button type="button" className={styles.copyBtn} onClick={copy}>📋 Copy Link</button>
        <div className={styles.shareBtns}>
          <button type="button" className={styles.social}>WhatsApp</button>
          <button type="button" className={styles.social}>Telegram</button>
        </div>
      </div>
    </S9ModalShell>
  )
}
