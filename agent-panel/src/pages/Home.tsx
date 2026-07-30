import { useNavigate } from 'react-router-dom'
import { Shell, StatusBar, fmt } from '../components/ui'
import { useStore } from '../data/store'
import { api } from '../api/client'

export default function Home() {
  const nav = useNavigate()
  const { summary, showToast, reload } = useStore()

  async function withdraw() {
    if (!summary?.salaryTransferOpen) {
      showToast('Transfer closed by admin')
      return
    }
    const max = Number(summary.salaryApproved ?? summary.transferable ?? 0)
    if (max <= 0) {
      showToast('No approved salary — wait for admin')
      return
    }
    try {
      const r = await api.post('/referral-agent/salary/withdraw', {})
      showToast(`Moved Rs ${fmt(r.amount)} to main wallet`)
      await reload()
    } catch (e: any) {
      showToast(e?.message || 'Withdraw failed')
    }
  }

  if (!summary) {
    return (
      <Shell>
        <StatusBar />
        <div className="scroll pad">Loading…</div>
      </Shell>
    )
  }

  return (
    <Shell>
      <StatusBar />
      <div className="topbar">
        <button className="tb-btn" onClick={() => nav('/profile')} aria-label="Menu">
          &#9776;
        </button>
        <span className="tb-spacer" />
        <span className="tb-face" onClick={() => nav('/profile')}>
          &#9786;
        </span>
      </div>
      <div className="scroll pad">
        <div className="section-label">REFERRAL SALARY</div>
        <div className="card balance-card">
          <div className="balance-col">
            <h3>Commission</h3>
            <div className="num">{fmt(summary.commissionBalance)}</div>
            {summary.salaryTransferOpen ? (
              <div className="sub violet" onClick={() => void withdraw()}>
                Withdraw approved {fmt(summary.salaryApproved ?? summary.transferable ?? 0)}
                {(summary.salaryHold ?? 0) > 0 ? ` · Hold ${fmt(summary.salaryHold ?? 0)}` : ''}
                &gt;&gt;
              </div>
            ) : (
              <div className="sub" style={{ opacity: 0.7 }}>
                Transfer closed · Hold {fmt(summary.salaryHold ?? summary.commissionBalance)}
              </div>
            )}
          </div>
          <div className="balance-col">
            <h3>This week</h3>
            <div className="num gold">{fmt(summary.earnedWeek)}</div>
            <div className="sub gold">Total {fmt(summary.earnedTotal)}</div>
          </div>
        </div>

        <div className="section-label">DOWNLINE (L3 → L1)</div>
        <div className="card" style={{ padding: 16 }} onClick={() => nav('/downline')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Level 3</span>
            <b>{summary.downline.level3}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Level 2</span>
            <b>{summary.downline.level2}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Level 1</span>
            <b>{summary.downline.level1}</b>
          </div>
        </div>

        <button className="btn btn-violet btn-block" style={{ marginTop: 16 }} onClick={() => nav('/commissions')}>
          Commission history
        </button>
        <div style={{ marginTop: 12, color: 'rgba(255,255,255,.7)', fontSize: 12, textAlign: 'center' }}>
          Code: {summary.referralCode}
        </div>
      </div>
    </Shell>
  )
}
