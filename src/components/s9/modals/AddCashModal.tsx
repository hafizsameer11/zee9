import { useEffect, useMemo, useRef, useState } from 'react'
import S9ModalShell from './S9ModalShell'
import MoneyRecordsModal from './MoneyRecordsModal'
import { api, getAccess } from '../../../api/client'
import { useConfig } from '../../../api/hooks'
import { sound } from '../../../lib/sound'
import styles from './AddCashModal.module.css'
import base from './modal.module.css'

type Props = { onClose: () => void; initialAmount?: number }

type Method = 'JAZZCASH' | 'EASYPAISA'
type PayMode = 'SIMPLE' | 'C2C'
type BonusEstimate = { pct: number; bonusAmount: number; label: string }

const METHOD_LABEL: Record<Method, string> = { JAZZCASH: 'Jazzcash', EASYPAISA: 'Easypaisa' }
const ALL_METHODS: Method[] = ['JAZZCASH', 'EASYPAISA']
const FALLBACK_PRESETS = [300, 500, 1000, 2000, 4000, 5000, 10000, 20000, 50000, 100000]

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #8b6914',
  background: '#1a0505',
  color: '#fff',
  fontSize: 13,
}

export default function AddCashModal({ onClose, initialAmount }: Props) {
  const config = useConfig()
  const minDep = config?.limits.minDeposit ?? 300
  const maxDep = config?.limits.maxDeposit ?? 100000
  const presets = config?.depositPresets?.length ? config.depositPresets : FALLBACK_PRESETS
  const enabledMethods = useMemo(() => {
    if (!config?.methods) return ALL_METHODS
    return ALL_METHODS.filter((m) => config.methods[m])
  }, [config])

  const [method, setMethod] = useState<Method>(enabledMethods[0] ?? 'JAZZCASH')
  const [payMode, setPayMode] = useState<PayMode>('C2C')
  const startAmt =
    initialAmount != null && initialAmount >= minDep && initialAmount <= maxDep
      ? initialAmount
      : minDep
  const [amount, setAmount] = useState(startAmt)
  const [bonusEst, setBonusEst] = useState<BonusEstimate | null>(null)
  const [busy, setBusy] = useState(false)
  const submitLock = useRef(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [showRecords, setShowRecords] = useState(false)

  useEffect(() => {
    if (enabledMethods.length && !enabledMethods.includes(method)) setMethod(enabledMethods[0])
  }, [enabledMethods, method])

  useEffect(() => {
    api
      .get(`/deposits/bonus-estimate?amount=${amount}`)
      .then(setBonusEst)
      .catch(() => setBonusEst(null))
  }, [amount])

  const bonus = Math.round(bonusEst?.bonusAmount ?? 0)
  const methodShort = METHOD_LABEL[method]

  async function goPay() {
    if (submitLock.current || busy) return
    if (payMode === 'SIMPLE') return setMsg(`${methodShort} Simple is coming soon`)
    if (amount < minDep) return setMsg(`Minimum deposit is Rs ${minDep}`)
    if (amount > maxDep) return setMsg(`Maximum deposit is Rs ${maxDep}`)
    submitLock.current = true
    setBusy(true)
    setMsg(null)
    try {
      // Server rotates a merchant account and returns a separate C2C pay URL
      const data = await api.post('/deposits', { amount, method, autoAssign: true })
      const payUrl = data?.paymentUrl || data?.paymentPath
      if (!data?.orderNo || !payUrl) {
        throw new Error('Could not open payment page')
      }
      sound.play('click')
      onClose()
      const url = new URL(payUrl, window.location.origin)
      const access = getAccess()
      const refresh = localStorage.getItem('zee9-player-refresh')
      if (access) url.searchParams.set('t', access)
      if (refresh) url.searchParams.set('r', refresh)
      window.location.assign(url.toString())
    } catch (e: any) {
      sound.play('error')
      setMsg(e?.message || 'Could not start deposit')
      submitLock.current = false
    } finally {
      setBusy(false)
    }
  }

  if (!enabledMethods.length) {
    return (
      <S9ModalShell title="Add Cash" onClose={onClose} wide hideSupport>
        <p style={{ padding: 20, color: '#ff8a80', textAlign: 'center' }}>All deposit methods are currently disabled.</p>
      </S9ModalShell>
    )
  }

  return (
    <>
    <S9ModalShell title="Add Cash" onClose={onClose} wide hideSupport>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 12px 4px' }}>
        <button
          type="button"
          onClick={() => setShowRecords(true)}
          style={{
            border: '1px solid #8b6914',
            background: 'rgba(0,0,0,.25)',
            color: '#ffd54f',
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 11,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Recharge Records
        </button>
      </div>
      <p className={base.sectionTitle}><span>💰</span> Amount</p>
      <div style={{ display: 'flex', gap: 6, padding: '0 12px 8px', flexWrap: 'wrap' }}>
        {presets.filter((p) => p >= minDep && p <= maxDep).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(p)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #8b6914',
              fontSize: 12,
              fontWeight: 700,
              background: amount === p ? '#e65100' : 'transparent',
              color: amount === p ? '#fff' : '#c9a24a',
            }}
          >
            Rs {p.toLocaleString('en-PK')}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '0 12px' }}>
        <div className={styles.productActive}>
          Rs {amount}
          {bonus > 0 && <span className={styles.bonusTag}>+{bonus}</span>}
        </div>
        <input
          type="number"
          value={amount}
          min={minDep}
          max={maxDep}
          onChange={(e) => setAmount(Number(e.target.value))}
          style={{ ...inputStyle, width: 100 }}
          aria-label="Amount"
        />
      </div>
      {bonusEst && bonusEst.pct > 0 && (
        <p style={{ fontSize: 11, color: '#8bd98b', padding: '4px 12px 0', margin: 0 }}>
          {bonusEst.label}: {bonusEst.pct}% bonus (Rs {bonus} after approval)
        </p>
      )}

      <p className={base.sectionTitle}><span>💳</span> Select payment method</p>
      <div className={styles.tabs}>
        {enabledMethods.map((m) => (
          <button
            key={m}
            type="button"
            className={method === m ? styles.tabOn : styles.tab}
            onClick={() => { setMethod(m); setPayMode('C2C') }}
          >
            {METHOD_LABEL[m]}
          </button>
        ))}
      </div>

      <div className={styles.channels} style={{ padding: '0 12px', overflowX: 'auto' }}>
        <button
          type="button"
          className={styles.channelOn}
          onClick={() => setPayMode('C2C')}
          style={{ minWidth: 110, flex: '0 0 auto' }}
        >
          <span className={styles.chBonus}>C2C</span>
          <span className={styles.chLabel}>{methodShort} (C2C)</span>
          <span className={styles.jazzLogo}>{method === 'JAZZCASH' ? 'Jazz Cash' : 'Easypaisa'}</span>
        </button>
      </div>

      <div style={{ padding: '8px 12px 0' }}>
        <div
          style={{
            border: '1px solid #8b6914',
            borderRadius: 10,
            padding: 14,
            background: 'rgba(0,0,0,.25)',
          }}
        >
          <b style={{ color: '#ffd54f', fontSize: 13 }}>C2C merchant payment</b>
          <p style={{ color: '#e8d0a0', fontSize: 12, margin: '8px 0 0' }}>
            You will be taken to a secure payment page with a merchant {methodShort} account and step-by-step
            instructions. A <b>new account</b> is assigned every time.
          </p>
        </div>
      </div>

      {msg && (
        <p style={{ color: '#ff8a80', fontSize: 12, padding: '6px 12px', margin: 0 }}>
          {msg}
        </p>
      )}

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.payBtn}
          onClick={() => void goPay()}
          disabled={busy}
        >
          {busy ? 'Opening…' : 'Continue to payment →'}
        </button>
      </div>
    </S9ModalShell>
    {showRecords && (
      <MoneyRecordsModal kind="deposit" onClose={() => setShowRecords(false)} />
    )}
    </>
  )
}
