import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../../api/client'
import { useConfig } from '../../../api/hooks'
import { usePlayerAuth } from '../../../api/auth'
import { useWallet } from '../../../context/WalletContext'
import { METHOD_LABEL, maskAccountNumber, type PayoutAccount } from '../../../api/payoutAccount'
import { sound } from '../../../lib/sound'
import ps from '../../../styles/premiumScreen.module.css'
import styles from './WithdrawScreen.module.css'
import MoneyRecordsModal from './MoneyRecordsModal'

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
  hasWithdrawPin?: boolean
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
  const { player, refreshPlayer } = usePlayerAuth()
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
  const submitLock = useRef(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [pin, setPin] = useState('')
  const [setupPin, setSetupPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [setupBusy, setSetupBusy] = useState(false)

  const hasPin = player?.hasWithdrawPin ?? elig?.hasWithdrawPin ?? false

  const rupees = parseAmount(amount, custom, minW, maxW)
  const eligibleRs = elig ? r(elig.eligibleAmount) : balance
  const playMore = elig && !elig.wagerOk ? Math.max(0, r(elig.wagerRemaining)) : 0
  const playToUnlock = Math.ceil(playMore)

  useEffect(() => {
    api
      .get('/withdrawals/eligibility')
      .then((d) => setElig(d))
      .catch(() => setElig(null))
  }, [])

  async function loadHistory() {
    setShowHistory(true)
  }

  async function saveWithdrawPin() {
    if (!/^\d{6}$/.test(setupPin)) return setErr('PIN must be exactly 6 digits')
    if (setupPin !== confirmPin) return setErr('PINs do not match')
    setErr(null)
    setSetupBusy(true)
    try {
      await api.post('/me/withdraw-pin', { pin: setupPin })
      await refreshPlayer()
      setSetupPin('')
      setConfirmPin('')
      sound.play('success')
      try {
        setElig(await api.get('/withdrawals/eligibility'))
      } catch { /* ignore */ }
    } catch (e: any) {
      sound.play('error')
      setErr(e?.message || 'PIN setup failed')
    } finally {
      setSetupBusy(false)
    }
  }

  async function submit() {
    if (submitLock.current || busy || done) return
    setErr(null)
    if (!hasPin) return setErr('Pehle 6-digit withdraw PIN set karein')
    if (!/^\d{6}$/.test(pin)) return setErr('6-digit withdraw PIN enter karein')
    if (!methodOk) return setErr(`${METHOD_LABEL[account.method]} withdrawals are disabled`)
    if (!rupees) return setErr('Enter a valid amount')
    if (rupees < minW) return setErr(`Minimum withdrawal is Rs ${minW}`)
    if (rupees > maxW) return setErr(`Maximum withdrawal is Rs ${maxW}`)
    if (elig && !elig.canWithdraw) {
      if (playToUnlock > 0) {
        return setErr(`Pehle ${playToUnlock.toLocaleString('en-PK')} chips game play karein, phir withdraw`)
      }
      return setErr(elig.reason || 'Abhi withdraw nahi ho sakta')
    }
    if (rupees > eligibleRs) return setErr(`Max eligible is Rs ${eligibleRs.toLocaleString('en-PK')}`)
    if (rupees > balance) return setErr('Insufficient balance')
    submitLock.current = true
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
        pin,
      })
      sound.play('success')
      await refresh()
      setDone(true)
      onSuccess?.()
    } catch (e: any) {
      sound.play('error')
      setErr(e?.message || 'Withdrawal failed')
      submitLock.current = false
      try {
        setElig(await api.get('/withdrawals/eligibility'))
      } catch { /* ignore */ }
    } finally {
      setBusy(false)
    }
  }

  if (!hasPin) {
    return (
      <div className={ps.overlay}>
        <div className={ps.screen}>
          <header className={ps.header}>
            <button type="button" className={ps.back} onClick={onClose} aria-label="Back">↩</button>
            <h1 className={ps.title}>Withdraw PIN</h1>
          </header>

          {err && <div style={{ background: '#c62828', color: '#fff', padding: '8px 14px', fontSize: 12, fontWeight: 700 }}>{err}</div>}

          <div className={styles.pinSetup}>
            <p className={styles.pinSetupTitle}>Withdraw ke liye 6-digit PIN set karein</p>
            <p className={styles.pinSetupHint}>Har withdraw par yeh PIN verify hoga.</p>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={setupPin}
              onChange={(e) => setSetupPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit PIN"
              className={styles.pinInput}
              autoComplete="new-password"
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Confirm PIN"
              className={styles.pinInput}
              autoComplete="new-password"
            />
            <button
              type="button"
              className={ps.goldBtn}
              style={{ marginTop: 16, width: '100%' }}
              disabled={setupBusy || setupPin.length !== 6 || confirmPin.length !== 6}
              onClick={() => void saveWithdrawPin()}
            >
              {setupBusy ? 'Saving…' : 'Save PIN & Continue'}
            </button>
          </div>
        </div>
      </div>
    )
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
        {elig && !elig.canWithdraw && elig.reason && playToUnlock <= 0 && (
          <div style={{ background: '#5c3d00', color: '#ffd54f', padding: '8px 14px', fontSize: 12, fontWeight: 600 }}>
            {elig.reason}
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

            {playToUnlock > 0 && (
              <div className={styles.playInfo}>
                <p>
                  Game mein aur <b>{playToUnlock.toLocaleString('en-PK')} Chips</b> play karein — uske baad withdraw
                  available hoga.
                </p>
                <p>
                  Poora balance nikalne ke liye bhi itni play complete karni zaroori hai.
                </p>
                <p className={styles.playNote}>
                  Har game ki bet is amount mein count hoti hai.
                </p>
              </div>
            )}

            <div className={styles.pinRow}>
              <label className={styles.pinLabel}>Withdraw PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit PIN"
                className={styles.pinInput}
                autoComplete="off"
              />
            </div>

            <div className={styles.rightFooter}>
              <span className={styles.fee}>Min Rs {minW} · Max Rs {maxW.toLocaleString('en-PK')}</span>
              <button
                type="button"
                className={ps.goldBtn}
                onClick={submit}
                disabled={busy || pin.length !== 6 || (elig != null && !elig.canWithdraw) || !methodOk}
              >
                {busy ? 'Submitting…' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>

        {showHistory && (
          <MoneyRecordsModal kind="withdraw" onClose={() => setShowHistory(false)} />
        )}
      </div>
    </div>
  )
}
