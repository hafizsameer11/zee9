import { useEffect, useMemo, useState } from 'react'
import { api } from '../../../api/client'
import { useConfig } from '../../../api/hooks'
import { useWallet } from '../../../context/WalletContext'
import { METHOD_LABEL, maskAccountNumber, type PayoutAccount } from '../../../api/payoutAccount'
import { sound } from '../../../lib/sound'
import ps from '../../../styles/premiumScreen.module.css'
import styles from './WithdrawScreen.module.css'

type Props = {
  onClose: () => void
  account: PayoutAccount
  onChangeAccount: () => void
  onSuccess?: () => void
}

type Eligibility = {
  canWithdraw: boolean
  eligibleAmount: number
  balance: number
  minWithdraw: number
  maxWithdraw: number
  depositWager: number
  hasDeposit: boolean
  deposited: number
  wagered: number
  wagerRequired: number
  wagerRemaining: number
  wagerOk: boolean
  reason: string | null
}

function parseAmount(label: string, custom: string, _min: number, _max: number): number | null {
  if (label === 'Other') {
    const n = Number(custom.replace(/,/g, ''))
    if (!Number.isFinite(n) || n <= 0) return null
    return n
  }
  const n = Number(label.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

const r = (paisa: number | bigint | undefined) => Number(paisa ?? 0) / 100

export default function WithdrawScreen({ onClose, account, onChangeAccount, onSuccess }: Props) {
  const config = useConfig()
  const { balance, refresh } = useWallet()
  const minW = config?.limits.minWithdraw ?? 600
  const maxW = config?.limits.maxWithdraw ?? 50000
  const methodOk = config?.methods?.[account.method] !== false

  const [elig, setElig] = useState<Eligibility | null>(null)
  const chips = useMemo(() => {
    const base = ['300', '600', '1,000', '3,000', '5,000', '10,000', 'Other']
    return base.filter((a) => a === 'Other' || (parseAmount(a, '', minW, maxW) ?? 0) >= minW)
  }, [minW, maxW])

  const [amount, setAmount] = useState(chips[0] ?? 'Other')
  const [custom, setCustom] = useState(String(minW))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<any[]>([])

  const rupees = parseAmount(amount, custom, minW, maxW)
  const eligibleRs = elig ? r(elig.eligibleAmount) : balance

  useEffect(() => {
    api
      .get('/withdrawals/eligibility')
      .then((d) => setElig(d))
      .catch(() => setElig(null))
  }, [])

  async function loadHistory() {
    try {
      const rows = await api.get('/withdrawals')
      setHistory(rows.slice(0, 20))
      setShowHistory(true)
    } catch {
      setErr('Could not load history')
    }
  }

  async function submit() {
    setErr(null)
    if (!methodOk) return setErr(`${METHOD_LABEL[account.method]} withdrawals are disabled`)
    if (!rupees) return setErr('Enter a valid amount')
    if (rupees < minW) return setErr(`Minimum withdrawal is Rs ${minW}`)
    if (rupees > maxW) return setErr(`Maximum withdrawal is Rs ${maxW}`)
    if (elig && !elig.canWithdraw) return setErr(elig.reason || 'Not eligible to withdraw yet')
    if (rupees > eligibleRs) return setErr(`Max eligible is Rs ${eligibleRs.toLocaleString('en-PK')}`)
    if (rupees > balance) return setErr('Insufficient balance')
    setBusy(true)
    try {
      await api.post('/withdrawals', {
        amount: rupees,
        method: account.method,
        accountDetails: {
          number: account.number,
          title: account.title,
          ...(account.bank ? { bank: account.bank } : {}),
        },
      })
      sound.play('success')
      await refresh()
      setDone(true)
      onSuccess?.()
    } catch (e: any) {
      sound.play('error')
      setErr(e?.message || 'Withdrawal failed')
      try {
        setElig(await api.get('/withdrawals/eligibility'))
      } catch { /* ignore */ }
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className={ps.overlay}>
        <div className={ps.screen}>
          <header className={ps.header}>
            <button type="button" className={ps.back} onClick={onClose}>↩</button>
            <h1 className={ps.title}>Withdraw</h1>
          </header>
          <div style={{ padding: 40, textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <h3 style={{ color: '#ffd54f' }}>Withdrawal submitted</h3>
            <p style={{ color: '#e8d0a0', fontSize: 13 }}>Rs {rupees?.toLocaleString('en-PK')} is pending confirmation.</p>
            <button type="button" className={ps.goldBtn} style={{ marginTop: 20 }} onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={ps.overlay}>
      <div className={ps.screen}>
        <header className={ps.header}>
          <button type="button" className={ps.back} onClick={onClose} aria-label="Back">↩</button>
          <h1 className={ps.title}>Withdraw</h1>
          <div className={ps.headerRight}>
            <button type="button" className={ps.hdrIcon} aria-label="History" onClick={loadHistory}>📋</button>
          </div>
        </header>

        {err && <div style={{ background: '#c62828', color: '#fff', padding: '8px 14px', fontSize: 12, fontWeight: 700 }}>{err}</div>}
        {elig && !elig.canWithdraw && elig.reason && (
          <div style={{ background: '#5c3d00', color: '#ffd54f', padding: '8px 14px', fontSize: 12, fontWeight: 600 }}>
            {elig.reason}
            {elig.depositWager > 0 && (
              <div style={{ marginTop: 4, opacity: 0.9, fontWeight: 500 }}>
                Played Rs {r(elig.wagered).toLocaleString('en-PK')} / need Rs {r(elig.wagerRequired).toLocaleString('en-PK')}
              </div>
            )}
          </div>
        )}

        <div className={ps.balanceStrip}>
          <div className={ps.balItem}>
            <span>Balance</span>
            <div className={ps.balPill}>
              <span className={ps.coin}>🪙</span> {balance.toLocaleString('en-PK')}
            </div>
          </div>
          <div className={ps.balItem}>
            <span>Eligible Withdrawal</span>
            <div className={ps.balPill}>
              <span className={ps.coin}>🪙</span> {eligibleRs.toLocaleString('en-PK')}
              <span className={styles.info}>ⓘ</span>
            </div>
          </div>
        </div>

        <div className={styles.main}>
          <div className={styles.left}>
            <p className={ps.sectionTitle}>
              <span className={styles.sectionIcon}>👤</span> Withdraw To
            </p>
            <div className={styles.accountCard}>
              <div className={styles.accGlow} aria-hidden />
              <span className={styles.accType}>{METHOD_LABEL[account.method]}</span>
              <span className={styles.accNum}>{maskAccountNumber(account.number)}</span>
              <span className={styles.accCheck}>✓</span>
            </div>
            <button type="button" className={styles.addAcc} onClick={onChangeAccount}>+ Change Account</button>
          </div>

          <div className={styles.right}>
            <p className={ps.sectionTitle}>
              <span className={styles.sectionIcon}>🪙</span> Withdraw amount
            </p>
            <div className={`${ps.chipGrid} ${styles.amountGrid}`}>
              {chips.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`${ps.chip} ${amount === a ? ps.chipActive : ''}`}
                  onClick={() => setAmount(a)}
                >
                  {a}
                </button>
              ))}
            </div>
            {amount === 'Other' && (
              <input
                type="number"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={`Min Rs ${minW}`}
                style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 8, border: '1px solid #8b6914', background: '#1a0505', color: '#fff' }}
              />
            )}
            <div className={styles.rightFooter}>
              <span className={styles.fee}>Min Rs {minW} · Max Rs {maxW.toLocaleString('en-PK')}</span>
              <button
                type="button"
                className={ps.goldBtn}
                onClick={submit}
                disabled={busy || (elig != null && !elig.canWithdraw) || !methodOk}
              >
                {busy ? 'Submitting…' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>

        {showHistory && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 20, padding: 20, overflow: 'auto' }} onClick={() => setShowHistory(false)}>
            <div style={{ background: '#1a0c00', border: '1px solid #8b6914', borderRadius: 12, padding: 16, maxWidth: 400, margin: '40px auto' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ color: '#ffd54f', margin: '0 0 12px' }}>Withdrawal History</h3>
              {history.length === 0 ? (
                <p style={{ color: '#c9a24a', fontSize: 13 }}>No withdrawals yet</p>
              ) : (
                history.map((w) => (
                  <div key={w.id} style={{ borderBottom: '1px solid rgba(139,105,20,.2)', padding: '8px 0', fontSize: 12, color: '#e8d0a0' }}>
                    <div>Rs {(Number(w.amount) / 100).toLocaleString('en-PK')} · {w.method} · <b>{w.status}</b></div>
                    <small>{new Date(w.createdAt).toLocaleString('en-PK')}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
