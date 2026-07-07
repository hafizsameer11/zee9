import { useState } from 'react'
import styles from './ReferEarnScreen.module.css'
import ReferListsModal from './ReferListsModal'
import {
  ReferDetailsModal,
  ReferGuideModal,
  ReferRankingModal,
  ShareLinkModal,
} from './ReferSubModals'

const LEVELS = [
  { lv: 1, referrals: 0, cashback: '0.5%' },
  { lv: 2, referrals: 5, cashback: '0.6%' },
  { lv: 3, referrals: 10, cashback: '0.8%' },
  { lv: 4, referrals: 30, cashback: '1%' },
  { lv: 5, referrals: 50, cashback: '1.2%' },
  { lv: 6, referrals: 100, cashback: '1.5%' },
  { lv: 7, referrals: 200, cashback: '2%' },
]

const RANKING = [
  { medal: '🥇', name: 'K*****N', amount: '1283.79' },
  { medal: '🥈', name: 'P*****3', amount: '1118.1' },
  { medal: '🥉', name: 'P*****5', amount: '569.8' },
]

type Props = {
  onClose: () => void
  onWithdraw?: () => void
}

export default function ReferEarnScreen({ onClose, onWithdraw }: Props) {
  const [showLists, setShowLists] = useState(false)
  const [showRanking, setShowRanking] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showShare, setShowShare] = useState(false)

  return (
    <div className={styles.overlay}>
      <div className={styles.screen}>
        <header className={styles.header}>
          <button type="button" className={styles.back} onClick={onClose}>↩</button>
          <h1>Refer&amp;Earn</h1>
          <div className={styles.headerRight}>
            <button type="button" className={styles.hdrAction} onClick={() => setShowRanking(true)}>
              <span>🏆</span>
              <small>Ranking</small>
            </button>
            <button type="button" className={styles.hdrAction} onClick={() => setShowGuide(true)}>
              <span>📜</span>
              <small>Guide</small>
            </button>
          </div>
        </header>

        <div className={styles.content}>
          {/* Level & Cashback */}
          <section className={styles.levelPanel}>
            <div className={styles.levelLeft}>
              <div className={styles.badge}>
                <span className={styles.badgeNum}>1</span>
                <span className={styles.badgeLv}>LV</span>
              </div>
              <p className={styles.upgradeText}>Upgrade to get 0.6% Cashback</p>
            </div>
            <button type="button" className={styles.rulesLink}>ⓘ Rules &gt;&gt;</button>

            <div className={styles.levelTable}>
              <div className={styles.tableRow}>
                <span className={styles.rowLabel}>👤 Valid Referrals</span>
                {LEVELS.map((l) => (
                  <div key={`r-${l.lv}`} className={`${styles.cell} ${l.lv === 1 ? styles.cellActive : ''}`}>
                    {l.lv === 1 && <span className={styles.lvDot}>LV{l.lv}</span>}
                    {l.lv !== 1 && <span className={styles.lvLabel}>LV{l.lv}</span>}
                    <strong>{l.referrals}</strong>
                  </div>
                ))}
              </div>
              <div className={styles.tableRow}>
                <span className={styles.rowLabel}>📊 Cashback Ratio</span>
                {LEVELS.map((l) => (
                  <div key={`c-${l.lv}`} className={`${styles.cell} ${l.lv === 1 ? styles.cellActive : ''}`}>
                    <strong>{l.cashback}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className={styles.middleRow}>
            {/* Team Members */}
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <h2>Team Members</h2>
                <button type="button" className={styles.link} onClick={() => setShowLists(true)}>Lists &gt;&gt;</button>
              </div>
              <div className={styles.teamBoxes}>
                <div className={styles.teamBox}>
                  <span className={styles.teamIcon}>👤</span>
                  <strong>0</strong>
                  <small>All Referrals</small>
                </div>
                <div className={styles.teamBox}>
                  <span className={styles.teamIcon}>👥</span>
                  <strong>0</strong>
                  <small>Valid Referral(s)</small>
                </div>
              </div>
            </section>

            {/* Earnings */}
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <h2>Earnings</h2>
                <button type="button" className={styles.link} onClick={() => setShowDetails(true)}>Details &gt;&gt;</button>
              </div>
              <div className={styles.earningsRow}>
                <div className={styles.earnBox}>
                  <strong>0</strong>
                  <small>Today&apos;s Referrals</small>
                </div>
                <div className={styles.earnBox}>
                  <strong>0</strong>
                  <small>Today&apos;s Reward</small>
                </div>
                <div className={styles.earnBox}>
                  <strong>0</strong>
                  <small>Available</small>
                </div>
                <button type="button" className={styles.withdrawBtn} onClick={onWithdraw}>WITHDRAW</button>
              </div>
            </section>
          </div>

          <div className={styles.bottomRow}>
            {/* Daily Ranking */}
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <h2>Daily Ranking</h2>
                <button type="button" className={styles.link} onClick={() => setShowRanking(true)}>Ranking &gt;&gt;</button>
              </div>
              <table className={styles.rankTable}>
                <thead>
                  <tr>
                    <th>Top3</th>
                    <th>Promoter</th>
                    <th>CashBack</th>
                  </tr>
                </thead>
                <tbody>
                  {RANKING.map((r) => (
                    <tr key={r.name}>
                      <td>{r.medal}</td>
                      <td>{r.name}</td>
                      <td>{r.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Invite Friends */}
            <section className={styles.inviteBanner}>
              <span className={styles.giftIcon}>🎁</span>
              <div className={styles.inviteCenter}>
                <h2>Invite Friends</h2>
                <button type="button" className={styles.shareBtn} onClick={() => setShowShare(true)}>
                  🔗 Share&amp;Copylink
                </button>
              </div>
              <span className={styles.coinsRight}>🪙🪙</span>
            </section>
          </div>
        </div>

        {/* Floating Activity tab */}
        <aside className={styles.activityTab}>
          <span className={styles.actLabel}>Activity</span>
          <div className={styles.actPromo}>
            <span>🎁</span>
            <strong>Rs 15,000</strong>
          </div>
        </aside>

        {showLists && <ReferListsModal onClose={() => setShowLists(false)} />}
        {showRanking && <ReferRankingModal onClose={() => setShowRanking(false)} />}
        {showGuide && <ReferGuideModal onClose={() => setShowGuide(false)} />}
        {showDetails && <ReferDetailsModal onClose={() => setShowDetails(false)} />}
        {showShare && <ShareLinkModal onClose={() => setShowShare(false)} />}
      </div>
    </div>
  )
}
