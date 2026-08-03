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
  validReferrals?: number
  promoterLevel?: number
  cashbackPct?: number
  nextPromoterLevel?: number | null
  nextPromoterLevelRequires?: number | null
  upgradeCashbackPct?: number | null
  commissionRates: { l1: number; l2: number; l3: number }
  totalCommission: number
  commissionBalance?: number
  gameBalance?: number
  salaryBalance?: number
  todayCommission?: number
  todayReferrals?: number
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
  direct: { name: string; phone: string; playerNo?: number | null; joined: string; isValid?: boolean; deposit?: number }[]
  referrer?: {
    name: string
    playerNo: number | null
    phone: string
    joined: string
    yourDeposit: number
    hasDeposited: boolean
    isValid: boolean
  } | null
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
          gameBalance: Number(ref.gameBalance ?? 0) || 0,
          salaryBalance: Number(ref.salaryBalance ?? ref.commissionBalance ?? ref.totalCommission) || 0,
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

  const promoterLv = ref?.promoterLevel ?? 1
  const validRefs = ref?.validReferrals ?? 0
  const currentTier = LEVELS.find((l) => l.lv === promoterLv) ?? LEVELS[0]!
  const upgradePct = ref?.upgradeCashbackPct ?? LEVELS.find((l) => l.lv === promoterLv + 1)?.cashback

  const availableBalance = Number(ref?.totalCommission ?? 0)
  const todayReward = Number(ref?.todayEarnings ?? ref?.todayCommission ?? 0)
  const todayRefs = ref?.todayReferrals ?? 0

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
            <section className={styles.shareCard}>
              <div className={styles.shareMeta}>
                <div className={styles.shareMetaItem}>
                  <label>Player ID</label>
                  <strong>{ref.playerNo ?? ref.playerId ?? '—'}</strong>
                </div>
                <div className={styles.shareMetaItem}>
                  <label>Your code</label>
                  <strong>{ref.referralCode}</strong>
                </div>
                {ref.channelCode && (
                  <div className={styles.shareMetaItem}>
                    <label>Channel</label>
                    <strong>{ref.channelCode}</strong>
                  </div>
                )}
                <div className={styles.shareMetaItem}>
                  <label>Commission earned</label>
                  <strong className={styles.commission}>
                    Rs {availableBalance.toLocaleString('en-PK')}
                  </strong>
                </div>
              </div>
              <div className={styles.shareRow}>
                <input readOnly value={ref.shareUrl} className={styles.shareInput} />
                <button type="button" onClick={copyLink} className={styles.copyBtn}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className={styles.levelCounts}>
                <span>
                  L1 <b>{ref.counts.level1}</b> ({ref.commissionRates.l1}%)
                </span>
                <span>
                  L2 <b>{ref.counts.level2}</b> ({ref.commissionRates.l2}%)
                </span>
                <span>
                  L3 <b>{ref.counts.level3}</b> ({ref.commissionRates.l3}%)
                </span>
              </div>
            </section>
          )}

          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{ref?.counts.level1 ?? 0}</span>
              <span className={styles.statLabel}>All Referrals</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{validRefs}</span>
              <span className={styles.statLabel}>Valid Referrals</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{todayRefs}</span>
              <span className={styles.statLabel}>Today&apos;s Referrals</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>Rs {availableBalance.toLocaleString('en-PK')}</span>
              <span className={styles.statLabel}>Available Balance</span>
            </div>
          </section>

          <button type="button" className={styles.listsBtn} onClick={() => setShowLists(true)}>
            👥 View My Referrals ({ref?.counts.level1 ?? 0})
          </button>

          {ref?.referrer && (
            <section className={styles.referrerCard}>
              <h3>My Referrer (who invited me)</h3>
              <div className={styles.referrerGrid}>
                <div>
                  <label>Name</label>
                  <strong>{ref.referrer.name}</strong>
                </div>
                <div>
                  <label>Player ID</label>
                  <strong>{ref.referrer.playerNo ?? '—'}</strong>
                </div>
                <div>
                  <label>Your deposit</label>
                  <strong>Rs {ref.referrer.yourDeposit.toLocaleString('en-PK')}</strong>
                </div>
                <div>
                  <label>Your status</label>
                  <strong className={ref.referrer.isValid ? styles.valid : styles.pending}>
                    {ref.referrer.isValid
                      ? 'Valid referral'
                      : ref.referrer.hasDeposited
                        ? 'Deposited (below Rs 1,000 min)'
                        : 'No deposit yet'}
                  </strong>
                </div>
              </div>
            </section>
          )}

          <p className={styles.earningsNote}>
            You earn cashback when friends <b>play games and lose</b> — not from their deposit alone.
            Rewards update through the day; friend needs Rs 1,000+ approved deposit to count as valid.
          </p>

          <section className={styles.levelPanel}>
            <button type="button" className={styles.rulesLink} onClick={() => setShowGuide(true)}>
              ⓘ Rules &gt;&gt;
            </button>
            <div className={styles.levelTop}>
              <div className={styles.badge}>
                <span className={styles.badgeNum}>{promoterLv}</span>
                <span className={styles.badgeLv}>LV</span>
              </div>
              <p className={styles.upgradeText}>
                {upgradePct
                  ? `Upgrade to get ${upgradePct} Cashback (${ref?.nextPromoterLevelRequires ?? 0} valid referrals)`
                  : `Max level — ${currentTier.cashback} Cashback`}
              </p>
            </div>

            <div className={styles.levelTableWrap}>
              <div className={styles.levelTable}>
                <div className={styles.tableRow}>
                  <span className={styles.rowLabel}>👤 Valid Referrals</span>
                  {LEVELS.map((l) => (
                    <div key={`r-${l.lv}`} className={`${styles.cell} ${l.lv === promoterLv ? styles.cellActive : ''}`}>
                      {l.lv === promoterLv && <span className={styles.lvDot}>LV{l.lv}</span>}
                      {l.lv !== promoterLv && <span className={styles.lvLabel}>LV{l.lv}</span>}
                      <strong>{l.referrals}</strong>
                    </div>
                  ))}
                </div>
                <div className={styles.tableRow}>
                  <span className={styles.rowLabel}>📊 Cashback Ratio</span>
                  {LEVELS.map((l) => (
                    <div key={`c-${l.lv}`} className={`${styles.cell} ${l.lv === promoterLv ? styles.cellActive : ''}`}>
                      <strong>{l.cashback}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.earningsCard}>
            <div className={styles.earningsInfo}>
              <h3>Earnings</h3>
              <div className={styles.earningsLine}>
                Today&apos;s reward: <strong>Rs {todayReward.toLocaleString('en-PK')}</strong>
              </div>
              <div className={styles.earningsLine}>
                Cashback rate:{' '}
                <strong>
                  {ref?.cashbackPct != null ? `${ref.cashbackPct}%` : currentTier.cashback}
                </strong>
              </div>
            </div>
            <div className={styles.earningsActions}>
              <button type="button" className={styles.linkBtn} onClick={() => setShowLists(true)}>
                Team Lists &gt;&gt;
              </button>
              <button type="button" className={styles.linkBtn} onClick={() => setShowDetails(true)}>
                Details &gt;&gt;
              </button>
              <button type="button" className={styles.withdrawBtn} onClick={onWithdraw}>
                WITHDRAW
              </button>
            </div>
          </section>

          <section className={styles.inviteCard}>
            <h2>🎁 Invite Friends</h2>
            <p>Share your link — earn cashback when friends play &amp; lose (updates through the day).</p>
            <button type="button" className={styles.shareBtn} onClick={() => setShowShare(true)}>
              Share &amp; Copy Link
            </button>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>Daily Ranking</h2>
              <button type="button" className={styles.link} onClick={() => setShowRanking(true)}>
                Full ranking &gt;&gt;
              </button>
            </div>
            <table className={styles.rankTable}>
              <thead>
                <tr>
                  <th>Top 3</th>
                  <th>Promoter</th>
                  <th>CashBack</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={`${r.name}-${i}`}>
                    <td>{r.medal}</td>
                    <td>{r.name}</td>
                    <td>{Number(r.amount).toLocaleString('en-PK')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

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
