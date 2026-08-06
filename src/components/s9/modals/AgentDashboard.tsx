import { useCallback, useEffect, useState } from 'react'
import { api } from '../../../api/client'
import { useWallet } from '../../../context/WalletContext'
import styles from './AgentDashboard.module.css'
import { AgentRulesModal, ShareLinkModal } from './ReferSubModals'
import AgentHistoryModal from './AgentHistoryModal'

type Team = {
  members: number
  deposit: number
  winLoss: number
  rollover: number
  commission: number
  date: string
}

type AgentRef = {
  referralCode: string
  shareUrl: string
  displayName: string
  userId: string
  playerNo?: number
  commissionBalance: number
  gameBalance?: number
  salaryBalance?: number
  totalCommission: number
  todayCommission?: number
  salaryTransferOpen?: boolean
  salaryApproved?: number
  salaryHold?: number
  transferable?: number
  commissionRates: { l1: number; l2: number; l3: number }
  downline: { level1: number; level2: number; level3: number }
  team: Team | null
}

type Member = {
  level: number
  id: string
  gameId?: string
  playerNo?: number
  name: string
  phone: string
  isAgent?: boolean
  role?: string
  rebatePct?: number
  bet?: number
  win?: number
  rollover?: number
  deposit?: number
  winLoss?: number
  commission?: number
  members?: number
  lastLogin?: string
  joined?: string
  status?: string
  lastGame?: { game: string; bet: number; payout: number; at: string; state: string } | null
  games?: Array<{ game: string; rounds: number; bet: number; win: number; winLoss: number }>
}

type Props = {
  onClose: () => void
  data: AgentRef
  onToast?: (msg: string) => void
}

function fmt(n: number) {
  return n.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

/** Signed amount for daily win-loss (+ / −). */
function fmtSigned(n: number) {
  const abs = fmt(Math.abs(n))
  if (n > 0) return `+${abs}`
  if (n < 0) return `−${abs}`
  return abs
}

function todayIso() {
  const PKT_OFFSET_MS = 5 * 60 * 60 * 1000
  return new Date(Date.now() + PKT_OFFSET_MS).toISOString().slice(0, 10)
}

function gameLabel(slug?: string | null) {
  if (!slug) return '—'
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function fmtPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('92') && d.length >= 12) return `+${d}`
  if (d.startsWith('0') && d.length >= 11) return `+92${d.slice(1)}`
  return phone.startsWith('+') ? phone : phone
}

function fmtDay(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}-${mm}-${yy}`
}

export default function AgentDashboard({ onClose, data, onToast }: Props) {
  const { refresh, balance: gameWallet } = useWallet()
  const [team, setTeam] = useState<Team>(
    data.team || { members: 0, deposit: 0, winLoss: 0, rollover: 0, commission: 0, date: todayIso() },
  )
  const [date, setDate] = useState(team.date || todayIso())
  const [sales, setSales] = useState(data.salaryBalance ?? data.commissionBalance)
  const [transferOpen, setTransferOpen] = useState(!!data.salaryTransferOpen)
  const [approved, setApproved] = useState(Number(data.salaryApproved ?? data.transferable ?? 0))
  const [hold, setHold] = useState(Number(data.salaryHold ?? 0))
  const [todayComm, setTodayComm] = useState(data.todayCommission ?? data.team?.commission ?? 0)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [membersTab, setMembersTab] = useState<'team' | 'earnings'>('team')
  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [memberDetail, setMemberDetail] = useState<Member | null>(null)
  const [pollTick, setPollTick] = useState(0)

  const openMembers = (tab: 'team' | 'earnings' = 'team') => {
    setMembersTab(tab)
    setShowMembers(true)
  }

  const loadTeam = useCallback(async (d: string) => {
    try {
      const t = await api.get(`/referrals/team?date=${encodeURIComponent(d)}`)
      setTeam(t)
      if (t.date) setDate(t.date)
      if (d === todayIso() || t.date === todayIso()) setTodayComm(t.commission ?? 0)
    } catch {
      /* ignore */
    }
  }, [])

  const refreshSales = useCallback(async () => {
    try {
      const s = await api.get('/referral-agent/summary')
      setSales(Number(s.salaryBalance ?? s.commissionBalance) || 0)
      setTransferOpen(!!s.salaryTransferOpen)
      setApproved(Number(s.salaryApproved ?? s.transferable ?? 0) || 0)
      setHold(Number(s.salaryHold) || 0)
    } catch {
      try {
        const r = await api.get('/referrals')
        setSales(Number(r.salaryBalance ?? r.commissionBalance) || 0)
        setTransferOpen(!!r.salaryTransferOpen)
        setApproved(Number(r.salaryApproved ?? r.transferable ?? 0) || 0)
        setHold(Number(r.salaryHold) || 0)
        if (r.todayCommission != null) setTodayComm(Number(r.todayCommission) || 0)
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    void loadTeam(date)
  }, [date, loadTeam, pollTick])

  useEffect(() => {
    void refreshSales()
  }, [refreshSales, pollTick])

  useEffect(() => {
    const id = window.setInterval(() => setPollTick((n) => n + 1), 15000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!showMembers) return
    let cancelled = false
    setMembersLoading(true)
    void api
      .get(`/referrals/members?date=${encodeURIComponent(date)}`)
      .then((res) => {
        if (cancelled) return
        const rows = Array.isArray(res) ? res : res?.items || []
        setMembers(rows)
      })
      .catch((e: any) => {
        if (cancelled) return
        onToast?.(e?.message || 'Failed to load members')
        // keep previous list on error — don't flash empty
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showMembers, date, onToast])

  // Soft refresh members while modal open (don't wipe on failure)
  useEffect(() => {
    if (!showMembers || pollTick === 0) return
    void api
      .get(`/referrals/members?date=${encodeURIComponent(date)}`)
      .then((res) => {
        const rows = Array.isArray(res) ? res : res?.items || []
        setMembers(rows)
        if (memberDetail) {
          const fresh = rows.find((m: Member) => m.id === memberDetail.id && m.level === memberDetail.level)
          if (fresh) setMemberDetail(fresh)
        }
      })
      .catch(() => {
        /* keep list */
      })
  }, [pollTick, showMembers, date, memberDetail?.id, memberDetail?.level])

  const copyLink = () => {
    navigator.clipboard?.writeText(data.shareUrl).catch(() => {})
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const transferToBalance = async () => {
    if (busy || !transferOpen || approved <= 0) {
      onToast?.(transferOpen ? 'No approved salary to transfer' : 'Withdraw frozen by admin')
      return
    }
    setBusy(true)
    try {
      const res = (await api.post('/referral-agent/salary/withdraw', {})) as { amount?: number }
      await Promise.all([refresh(), refreshSales(), loadTeam(date)])
      onToast?.(`Transferred Rs ${fmt(res.amount ?? approved)} to balance`)
    } catch (e: any) {
      onToast?.(e?.message || 'Transfer failed')
    } finally {
      setBusy(false)
    }
  }

  const rebatePct = data.commissionRates.l1

  return (
    <div className={styles.overlay}>
      <div className={styles.screen}>
        <header className={styles.header}>
          <button type="button" className={styles.back} onClick={onClose} aria-label="Back">
            ↩
          </button>
          <h1>Agent</h1>
          <span className={styles.todayPill}>Today +{fmt(todayComm)}</span>
        </header>

        <div className={styles.body}>
          <div className={styles.topRow}>
            <div className={styles.profileCard}>
              <div className={styles.avatar}>{data.displayName.slice(0, 1).toUpperCase()}</div>
              <div>
                <div className={styles.idLine}>ID: [{data.playerNo ?? data.userId}]</div>
                <div className={styles.rebateLine}>
                  Commission rebate: <b>{rebatePct}%</b>
                </div>
              </div>
            </div>

            <div className={styles.salesCard}>
              <div className={styles.walletSplit}>
                <div>
                  <div className={styles.walletK}>Game wallet</div>
                  <div className={styles.walletV}>{fmt(gameWallet)}</div>
                  <div className={styles.walletHint}>Deposits + wins only</div>
                </div>
                <div>
                  <div className={styles.walletK}>Salary wallet</div>
                  <div className={styles.salesAmount}>{fmt(sales)}</div>
                  <div className={styles.walletHint}>Team commission — not playable</div>
                </div>
              </div>
              <div className={styles.salesLabel}>Salary Commission (on hold)</div>
              {(hold > 0 || approved > 0) && (
                <div className={styles.holdLine}>
                  {transferOpen ? (
                    <>
                      Approved {fmt(approved)}
                      {hold > 0 ? ` · Hold ${fmt(hold)}` : ''}
                    </>
                  ) : (
                    hold > 0 || sales > 0 ? `On hold ${fmt(hold > 0 ? hold : sales)}` : null
                  )}
                </div>
              )}
              <div className={styles.salesActions}>
                <button type="button" className={styles.historyBtn} onClick={() => setShowHistory(true)}>
                  History
                </button>
                {transferOpen && (
                  <button
                    type="button"
                    className={styles.transferBtn}
                    disabled={busy || approved <= 0}
                    onClick={() => void transferToBalance()}
                  >
                    {busy ? '…' : 'Transfer to balance'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <section className={styles.teamSection}>
            <div className={styles.teamHead}>
              <h2>My Team:</h2>
              <input
                type="date"
                className={styles.dateInput}
                value={date}
                max={todayIso()}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className={styles.statGrid}>
              <div className={styles.statBox}>
                <strong>{fmt(team.members)}</strong>
                <span>Members</span>
              </div>
              <div className={styles.statBox}>
                <strong>{fmt(team.deposit)}</strong>
                <span>Deposit</span>
              </div>
              <div className={`${styles.statBox} ${team.winLoss < 0 ? styles.neg : team.winLoss > 0 ? styles.pos : ''}`}>
                <strong>{fmtSigned(team.winLoss)}</strong>
                <span>Win-loss</span>
              </div>
              <div className={styles.statBox}>
                <strong>{fmt(team.rollover)}</strong>
                <span>Rollover</span>
              </div>
              <div className={`${styles.statBox} ${styles.statGreen}`}>
                <strong>{fmt(team.commission)}</strong>
                <span>Team earn ({date.slice(8, 10)}/{date.slice(5, 7)})</span>
              </div>
            </div>
          </section>

          <section className={styles.rebateTable}>
            <div className={styles.rebateHead}>
              <span>Rebate Type</span>
              <span>By win-loss</span>
              <span>Rebate percentage</span>
            </div>
            <div className={styles.rebateRow}>
              <span>Level 1</span>
              <span>Net loss</span>
              <span className={styles.pct}>{data.commissionRates.l1}%</span>
            </div>
            <div className={styles.rebateRow}>
              <span>Level 2</span>
              <span>Net loss</span>
              <span className={styles.pct}>{data.commissionRates.l2}%</span>
            </div>
            <div className={styles.rebateRow}>
              <span>Level 3</span>
              <span>Net loss</span>
              <span className={styles.pct}>{data.commissionRates.l3}%</span>
            </div>
          </section>

          <div className={styles.inviteRow}>
            <button type="button" className={styles.inviteBtn} onClick={copyLink}>
              <span className={styles.inviteIcon}>＋👤</span>
              {copied ? 'Link copied!' : 'Invited'}
            </button>
            <button type="button" className={styles.shareLinkBtn} onClick={() => setShowShare(true)}>
              Share link
            </button>
          </div>

          <div className={styles.downlineHint}>
            Downline L3 {data.downline.level3} · L2 {data.downline.level2} · L1 {data.downline.level1}
          </div>
        </div>

        <aside className={styles.sideNav}>
          <button type="button" className={styles.sideTab} onClick={() => openMembers('team')}>
            <span>👥</span>
            Members
          </button>
          <button type="button" className={styles.sideTab} onClick={() => setShowRules(true)}>
            <span>📜</span>
            Rules
          </button>
        </aside>

        {showHistory && <AgentHistoryModal onClose={() => setShowHistory(false)} />}
        {showRules && <AgentRulesModal onClose={() => setShowRules(false)} />}
        {showShare && <ShareLinkModal onClose={() => setShowShare(false)} shareUrl={data.shareUrl} />}

        {showMembers && (
          <div className={styles.membersOverlay} onClick={() => setShowMembers(false)} role="presentation">
            <div className={styles.membersModalWide} onClick={(e) => e.stopPropagation()} role="dialog">
              <header className={styles.membersHead}>
                <h2>MEMBERS</h2>
                <button type="button" className={styles.membersClose} onClick={() => setShowMembers(false)}>
                  ✕
                </button>
              </header>

              <div className={styles.membersLayout}>
                <aside className={styles.membersSide}>
                  <button
                    type="button"
                    className={membersTab === 'team' ? styles.membersSideActive : styles.membersSideBtn}
                    onClick={() => setMembersTab('team')}
                  >
                    My team
                  </button>
                  <button
                    type="button"
                    className={membersTab === 'earnings' ? styles.membersSideActive : styles.membersSideBtn}
                    onClick={() => {
                      setShowMembers(false)
                      setShowHistory(true)
                    }}
                  >
                    History
                  </button>
                </aside>

                <div className={styles.membersBody}>
                  {membersLoading && members.length === 0 ? (
                    <p className={styles.empty}>Loading team…</p>
                  ) : members.length === 0 ? (
                    <p className={styles.empty}>No members yet — share your invite link.</p>
                  ) : (
                    <>
                      <p className={styles.membersMeta}>
                        {members.length} downline · date {date} · sorted by win-loss (high first)
                      </p>
                      {members.map((m) => {
                      const gid = m.gameId || (m.playerNo != null ? String(m.playerNo) : m.id.slice(-8))
                      const isAgent = !!m.isAgent
                      return (
                        <article key={`${m.level}-${m.id}`} className={styles.memberCard}>
                          <div className={styles.mcLeft}>
                            <div className={styles.mcAvatar}>{m.name.slice(0, 1).toUpperCase()}</div>
                            <span className={isAgent ? styles.badgeAgent : styles.badgePlayer}>
                              {isAgent ? 'Agent' : 'Player'}
                            </span>
                            <div className={styles.mcUid}>Game ID: {gid}</div>
                            <div className={styles.mcPhone}>{fmtPhone(m.phone)}</div>
                            {m.lastGame?.game && (
                              <div className={styles.mcGame}>Last: {gameLabel(m.lastGame.game)}</div>
                            )}
                          </div>

                          <div className={styles.mcMid}>
                            <div>
                              <span>Bet</span>
                              <b>{fmt(m.bet ?? 0)}</b>
                            </div>
                            <div>
                              <span>Win</span>
                              <b>{fmt(m.win ?? 0)}</b>
                            </div>
                          </div>

                          <div className={styles.mcRight}>
                            <div>Last login: {fmtDay(m.lastLogin)}</div>
                            <div>Rollover: {fmt(m.rollover ?? m.bet ?? 0)}</div>
                            <div
                              className={
                                (m.commission ?? 0) < 0
                                  ? styles.negText
                                  : (m.commission ?? 0) > 0
                                    ? styles.posText
                                    : undefined
                              }
                            >
                              Commission: {fmtSigned(m.commission ?? 0)}
                            </div>
                            <div>Members: {fmt(m.members ?? 0)}</div>
                            <div>Deposit: {fmt(m.deposit ?? 0)}</div>
                            <div className={(m.winLoss ?? 0) < 0 ? styles.negText : (m.winLoss ?? 0) > 0 ? styles.posText : undefined}>
                              Win-loss: {fmtSigned(m.winLoss ?? 0)}
                            </div>
                            {m.games && m.games.length > 0 && (
                              <div className={styles.mcGames}>
                                Games:{' '}
                                {m.games
                                  .slice(0, 3)
                                  .map((g) => `${gameLabel(g.game)} ${fmtSigned(g.winLoss)}`)
                                  .join(' · ')}
                              </div>
                            )}
                          </div>

                          <div className={styles.mcPct}>
                            <strong>{m.rebatePct ?? 0}%</strong>
                            <span className={styles.mcLv}>L{m.level}</span>
                            <button
                              type="button"
                              className={styles.mcInfo}
                              aria-label="Member details"
                              onClick={() => setMemberDetail(m)}
                            >
                              🔍
                            </button>
                          </div>
                        </article>
                      )
                    })}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {memberDetail && (
          <div className={styles.membersOverlay} onClick={() => setMemberDetail(null)} role="presentation">
            <div className={styles.memberDetailCard} onClick={(e) => e.stopPropagation()} role="dialog">
              <header className={styles.membersHead}>
                <h2>Member info</h2>
                <button type="button" className={styles.membersClose} onClick={() => setMemberDetail(null)}>
                  ✕
                </button>
              </header>
              <div className={styles.memberDetailBody}>
                <p>
                  <b>{memberDetail.name}</b>{' '}
                  <span className={memberDetail.isAgent ? styles.badgeAgent : styles.badgePlayer}>
                    {memberDetail.isAgent ? 'Agent' : 'Player'}
                  </span>
                </p>
                <p>
                  Game ID:{' '}
                  <b>{memberDetail.gameId || memberDetail.playerNo || memberDetail.id.slice(-8)}</b>
                </p>
                <p>Phone: {fmtPhone(memberDetail.phone)}</p>
                <p>Level: L{memberDetail.level}</p>
                <p>Rebate: {memberDetail.rebatePct ?? 0}%</p>
                <p>Bet: {fmt(memberDetail.bet ?? 0)}</p>
                <p>Win: {fmt(memberDetail.win ?? 0)}</p>
                <p>Deposit: {fmt(memberDetail.deposit ?? 0)}</p>
                <p className={(memberDetail.winLoss ?? 0) > 0 ? styles.posText : (memberDetail.winLoss ?? 0) < 0 ? styles.negText : undefined}>
                  Win-loss: {fmtSigned(memberDetail.winLoss ?? 0)}
                </p>
                <p
                  className={
                    (memberDetail.commission ?? 0) > 0
                      ? styles.posText
                      : (memberDetail.commission ?? 0) < 0
                        ? styles.negText
                        : undefined
                  }
                >
                  Commission: {fmtSigned(memberDetail.commission ?? 0)}
                </p>
                <p>Members: {fmt(memberDetail.members ?? 0)}</p>
                <p>Rollover: {fmt(memberDetail.rollover ?? memberDetail.bet ?? 0)}</p>
                <p>Last login: {fmtDay(memberDetail.lastLogin)}</p>
                <p>Joined: {fmtDay(memberDetail.joined)}</p>
                {memberDetail.lastGame && (
                  <p>
                    Last game: <b>{gameLabel(memberDetail.lastGame.game)}</b> · bet{' '}
                    {fmt(memberDetail.lastGame.bet)} · payout {fmt(memberDetail.lastGame.payout)}
                  </p>
                )}
                {memberDetail.games && memberDetail.games.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <b>Today by game</b>
                    {memberDetail.games.map((g) => (
                      <p key={g.game} style={{ margin: '4px 0' }}>
                        {gameLabel(g.game)} · {g.rounds} rounds · W/L {fmtSigned(g.winLoss)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
