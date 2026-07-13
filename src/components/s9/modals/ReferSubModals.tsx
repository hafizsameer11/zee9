import { useEffect, useState } from 'react'
import { api } from '../../../api/client'
import S9ModalShell from './S9ModalShell'
import styles from './ReferSubModals.module.css'

type RankingRow = { rank: number; name: string; amount: number }
type EarningRow = { id: string; level: number; amount: number; from: string; time: string }

export function ReferRankingModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<RankingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/referrals/ranking').then(setRows).catch(() => setRows([])).finally(() => setLoading(false))
  }, [])

  const medal = (r: number) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : String(r))

  return (
    <S9ModalShell title="Daily Ranking" onClose={onClose} wide>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Promoter</th>
            <th>Commission</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20 }}>Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20 }}>No ranking data yet</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.rank}>
                <td>{medal(r.rank)}</td>
                <td>{r.name}</td>
                <td className={styles.gold}>Rs {r.amount.toLocaleString('en-PK')}</td>
              </tr>
            ))
          )}
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
        <li>Friend registers using your link or referral code.</li>
        <li>When they deposit, you earn commission (agents only).</li>
        <li>Upgrade your agent rank by getting more valid referrals.</li>
        <li>Withdraw earnings from the Earnings panel.</li>
      </ol>
    </S9ModalShell>
  )
}

export function ReferDetailsModal({ onClose }: { onClose: () => void }) {
  const [todayEarnings, setTodayEarnings] = useState(0)
  const [items, setItems] = useState<EarningRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/referrals/earnings')
      .then((d) => { setTodayEarnings(d.todayEarnings); setItems(d.items) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <S9ModalShell title="Earnings Details" onClose={onClose} wide>
      {loading ? (
        <div className={styles.empty}><p>Loading…</p></div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <span>📊</span>
          <p>No earnings yet</p>
          <small>Invite friends to start earning commission rewards.</small>
        </div>
      ) : (
        <>
          <p style={{ color: '#ffd54f', fontWeight: 700, margin: '0 0 12px' }}>
            Today: Rs {todayEarnings.toLocaleString('en-PK')}
          </p>
          <table className={styles.table}>
            <thead>
              <tr><th>From</th><th>Level</th><th>Amount</th><th>Date</th></tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id}>
                  <td>{e.from}</td>
                  <td>L{e.level}</td>
                  <td className={styles.gold}>Rs {e.amount.toLocaleString('en-PK')}</td>
                  <td>{new Date(e.time).toLocaleDateString('en-PK')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </S9ModalShell>
  )
}

export function ShareLinkModal({ onClose, shareUrl }: { onClose: () => void; shareUrl: string }) {
  const link = shareUrl

  const copy = () => {
    navigator.clipboard?.writeText(link)
  }

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(link)}`, '_blank', 'noopener')
  }

  return (
    <S9ModalShell title="Share & Copy Link" onClose={onClose}>
      <div className={styles.share}>
        <p className={styles.link}>{link}</p>
        <button type="button" className={styles.copyBtn} onClick={copy}>📋 Copy Link</button>
        <div className={styles.shareBtns}>
          <button type="button" className={styles.social} onClick={shareWhatsApp}>WhatsApp</button>
        </div>
      </div>
    </S9ModalShell>
  )
}
