import { useState } from 'react'
import S9ModalShell from './S9ModalShell'
import styles from './NewsScreen.module.css'

type Props = { onClose: () => void; onClaim?: () => void }

const TABS = [
  { id: 'new-user', label: 'New user great offer' },
  { id: 'pocket', label: 'Real pocket win' },
  { id: 'rebate', label: '0.8%-15% Rebate' },
  { id: 'agent', label: 'Agent cooperation bonus' },
  { id: 'invite', label: 'Invite friends super rewards' },
  { id: 'safebox', label: 'Safe box rebate' },
  { id: 'invite-win', label: 'Invite and win' },
]

const BONUS_ROWS = [
  { bet: '100', d3: '7', d7: '17', d10: '27' },
  { bet: '300', d3: '17', d7: '37', d10: '57' },
  { bet: '500', d3: '27', d7: '57', d10: '77' },
  { bet: '1000', d3: '37', d7: '77', d10: '177' },
  { bet: '3000', d3: '77', d7: '177', d10: '377' },
  { bet: '5000', d3: '177', d7: '377', d10: '777' },
  { bet: '10000', d3: '377', d7: '777', d10: '1777' },
]

export default function NewsScreen({ onClose, onClaim }: Props) {
  const [activeTab, setActiveTab] = useState('new-user')

  return (
    <S9ModalShell title="News" onClose={onClose} wide hideSupport bodyClassName={styles.bodyPad}>
      <div className={styles.layout}>
        <nav className={styles.sidebar}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className={styles.content}>
          <div className={styles.banner}>
            <span className={styles.bannerGold}>S9777 PKR</span>
            <span> — New Register Customers 3 / 7 / 10 Days Claim</span>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thBlue}>Register 3 days bonus</th>
                  <th className={styles.thGreen}>Register 7 days bonus</th>
                  <th className={styles.thGold}>Register 10 days bonus</th>
                </tr>
              </thead>
              <tbody>
                {BONUS_ROWS.map((row) => (
                  <tr key={row.bet}>
                    <td>
                      <div className={styles.cellHead}>Total Bet</div>
                      <div className={styles.cellVal}>{row.bet}</div>
                      <div className={styles.cellHead}>Bonus(PKR)</div>
                      <div className={styles.cellVal}>{row.d3}</div>
                    </td>
                    <td>
                      <div className={styles.cellHead}>Total Bet</div>
                      <div className={styles.cellVal}>{row.bet}</div>
                      <div className={styles.cellHead}>Bonus(PKR)</div>
                      <div className={styles.cellVal}>{row.d7}</div>
                    </td>
                    <td>
                      <div className={styles.cellHead}>Total Bet</div>
                      <div className={styles.cellVal}>{row.bet}</div>
                      <div className={styles.cellHead}>Bonus(PKR)</div>
                      <div className={styles.cellVal}>{row.d10}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className={styles.note}>
            New registered customers can claim bonus rewards on day 3, 7 and 10 after registration.
            Total bet amount must be reached within the period to unlock each tier.
          </p>

          <button type="button" className={styles.claimBtn} onClick={() => onClaim?.()}>
            🎁 Deposit to Unlock
          </button>
        </div>
      </div>
    </S9ModalShell>
  )
}
