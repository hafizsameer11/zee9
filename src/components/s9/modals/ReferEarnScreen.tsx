import { useEffect, useState } from 'react'
import { api } from '../../../api/client'
import styles from './ReferEarnScreen.module.css'
import ReferListsModal from './ReferListsModal'
import AgentDashboard from './AgentDashboard'
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

const RANKING_DEFAULT = [
  { medal: '🥇', name: '—', amount: '0' },
  { medal: '🥈', name: '—', amount: '0' },
  { medal: '🥉', name: '—', amount: '0' },
]

type Props = {
  onClose: () => void
  onWithdraw?: () => void
  onToast?: (msg: string) => void
}

type RefData = {
  referralCode: string
  channelCode: string
  shareUrl: string
  counts: { level1: number; level2: number; level3: number }
  downline?: { level1: number; level2: number; level3: number }
  commissionRates: { l1: number; l2: number; l3: number }
  totalCommission: number
  commissionBalance?: number
  todayCommission?: number
  todayEarnings?: number
  salaryTransferOpen?: boolean
  salaryApproved?: number
  salaryHold?: number
  transferable?: number
  referralAgentActive?: boolean
  displayName?: string
  userId?: string
  playerNo?: number
  playerId?: number
  team?: {
    members: number
    deposit: number
    winLoss: number
    rollover: number
    commission: number
    date: string
  } | null
  direct: { name: string; phone: string; joined: string }[]
}

export default function ReferEarnScreen({ onClose, onWithdraw, onToast }: Props) {
  const [showLists, setShowLists] = useState(false)
  const [showRanking, setShowRanking] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [ref, setRef] = useState<RefData | null>(null)
  const [ranking, setRanking] = useState(RANKING_DEFAULT)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/referrals'),
      api.get('/referrals/earnings').catch(() => ({ todayEarnings: 0 })),
      api.get('/referrals/ranking').catch(() => []),
    ])
      .then(([refData, earnings, rankingRows]) => {
        setRef({ ...refData, todayEarnings: earnings.todayEarnings })
        if (Array.isArray(rankingRows) && rankingRows.length > 0) {
          setRanking(
            rankingRows.slice(0, 3).map((r: { rank: number; name: string; amount: number }) => ({
              medal: r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉',
              name: r.name,
              amount: String(r.amount),
            })),
          )
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const copyLink = () => {
    if (!ref) return
    navigator.clipboard?.writeText(ref.shareUrl).catch(() => {})
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  if (!loading && ref?.referralAgentActive) {
    return (
      <AgentDashboard
        onClose={onClose}
        onToast={onToast}
        data={{
          referralCode: ref.referralCode,
          shareUrl: ref.shareUrl,
          displayName: ref.displayName || 'Agent',
          userId: String(ref.playerNo ?? ref.playerId ?? ref.userId ?? ref.referralCode),
          playerNo: ref.playerNo ?? ref.playerId,
          commissionBalance: Number(ref.commissionBalance ?? ref.totalCommission) || 0,
          totalCommission: Number(ref.totalCommission) || 0,
          todayCommission: Number(ref.todayCommission ?? ref.todayEarnings) || 0,
          salaryTransferOpen: !!ref.salaryTransferOpen,
          salaryApproved: Number(ref.salaryApproved ?? ref.transferable ?? 0) || 0,
          salaryHold: Number(ref.salaryHold ?? 0) || 0,
          transferable: Number(ref.transferable ?? ref.salaryApproved ?? 0) || 0,
          commissionRates: ref.commissionRates,
          downline: ref.downline || {
            level1: ref.counts.level1,
            level2: ref.counts.level2,
            level3: ref.counts.level3,
          },
          team: ref.team ?? null,
        }}
      />
    )
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.screen}>
        <header className={styles.header}>
          <button type="button" className={styles.back} onClick={onClose}>
            ↩
          </button>
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
          {ref && (
            <section
              style={{
                background: 'linear-gradient(180deg,#3a1a00,#1a0c00)',
                border: '1px solid #8b6914',
                borderRadius: 12,
                padding: 12,
                margin: '0 0 12px',
              }}
            >
              <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: '#c9a24a', fontSize: 10 }}>Player ID</div>
                  <b style={{ color: '#ffd54f', fontSize: 16 }}>{ref.playerNo ?? ref.playerId ?? '—'}</b>
                </div>
                <div>
                  <div style={{ color: '#c9a24a', fontSize: 10 }}>Your code</div>
                  <b style={{ color: '#ffd54f', fontSize: 16 }}>{ref.referralCode}</b>
                </div>
                {ref.channelCode && (
                  <div>
                    <div style={{ color: '#c9a24a', fontSize: 10 }}>Channel</div>
                    <b style={{ color: '#fff', fontSize: 16 }}>{ref.channelCode}</b>
                  </div>
                )}
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ color: '#c9a24a', fontSize: 10 }}>Commission earned</div>
                  <b style={{ color: '#8bd98b', fontSize: 16 }}>
                    Rs {(Number(ref.totalCommission) / 100).toLocaleString('en-PK')}
                  </b>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  readOnly
                  value={ref.shareUrl}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: '#1a0505',
                    border: '1px solid #8b6914',
                    borderRadius: 8,
                    color: '#e8d0a0',
                    fontSize: 11,
                    padding: '8px 10px',
                  }}
                />
                <button
                  type="button"
                  onClick={copyLink}
                  style={{
                    background: 'linear-gradient(180deg,#ffb300,#e65100)',
                    border: '1px solid #ffe082',
                    color: '#fff',
                    fontWeight: 800,
                    borderRadius: 8,
                    padding: '0 16px',
                    fontSize: 12,
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 8, color: '#e8d0a0', fontSize: 11 }}>
                <span>
                  L1 <b style={{ color: '#fff' }}>{ref.counts.level1}</b> ({ref.commissionRates.l1}%)
                </span>
                <span>
                  L2 <b style={{ color: '#fff' }}>{ref.counts.level2}</b> ({ref.commissionRates.l2}%)
                </span>
                <span>
                  L3 <b style={{ color: '#fff' }}>{ref.counts.level3}</b> ({ref.commissionRates.l3}%)
                </span>
              </div>
            </section>
          )}

          <section className={styles.levelPanel}>
            <div className={styles.levelLeft}>
              <div className={styles.badge}>
                <span className={styles.badgeNum}>1</span>
                <span className={styles.badgeLv}>LV</span>
              </div>
              <p className={styles.upgradeText}>Upgrade to get 0.6% Cashback</p>
            </div>
            <button type="button" className={styles.rulesLink} onClick={() => setShowGuide(true)}>
              ⓘ Rules &gt;&gt;
            </button>

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
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <h2>Team Members</h2>
                <button type="button" className={styles.link} onClick={() => setShowLists(true)}>
                  Lists &gt;&gt;
                </button>
              </div>
              <div className={styles.teamBoxes}>
                <div className={styles.teamBox}>
                  <span className={styles.teamIcon}>👤</span>
                  <strong>{ref?.counts.level1 ?? 0}</strong>
                  <small>All Referrals</small>
                </div>
                <div className={styles.teamBox}>
                  <span className={styles.teamIcon}>👥</span>
                  <strong>{ref?.counts.level1 ?? 0}</strong>
                  <small>Valid Referral(s)</small>
                </div>
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <h2>Earnings</h2>
                <button type="button" className={styles.link} onClick={() => setShowDetails(true)}>
                  Details &gt;&gt;
                </button>
              </div>
              <div className={styles.earningsRow}>
                <div className={styles.earnBox}>
                  <strong>{ref?.counts.level1 ?? 0}</strong>
                  <small>Today&apos;s Referrals</small>
                </div>
                <div className={styles.earnBox}>
                  <strong>Rs {(ref?.todayEarnings ?? 0).toLocaleString('en-PK')}</strong>
                  <small>Today&apos;s Reward</small>
                </div>
                <div className={styles.earnBox}>
                  <strong>Rs {((ref?.totalCommission ?? 0) / 100).toLocaleString('en-PK')}</strong>
                  <small>Available</small>
                </div>
                <button type="button" className={styles.withdrawBtn} onClick={onWithdraw}>
                  WITHDRAW
                </button>
              </div>
            </section>
          </div>

          <div className={styles.bottomRow}>
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <h2>Daily Ranking</h2>
                <button type="button" className={styles.link} onClick={() => setShowRanking(true)}>
                  Ranking &gt;&gt;
                </button>
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
                  {ranking.map((r) => (
                    <tr key={r.name}>
                      <td>{r.medal}</td>
                      <td>{r.name}</td>
                      <td>{r.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

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

        <aside className={styles.activityTab}>
          <span className={styles.actLabel}>Activity</span>
          <div className={styles.actPromo}>
            <span>🎁</span>
            <strong>Rs 15,000</strong>
          </div>
        </aside>

        {showLists && (
          <ReferListsModal
            onClose={() => setShowLists(false)}
            referrals={ref?.direct ?? []}
            totalCommission={ref?.totalCommission ?? 0}
          />
        )}
        {showRanking && <ReferRankingModal onClose={() => setShowRanking(false)} />}
        {showGuide && <ReferGuideModal onClose={() => setShowGuide(false)} />}
        {showDetails && <ReferDetailsModal onClose={() => setShowDetails(false)} />}
        {showShare && ref && <ShareLinkModal onClose={() => setShowShare(false)} shareUrl={ref.shareUrl} />}
      </div>
    </div>
  )
}
