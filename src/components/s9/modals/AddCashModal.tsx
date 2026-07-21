import { useEffect, useMemo, useState } from 'react'
import S9ModalShell from './S9ModalShell'
import { api, uploadFile } from '../../../api/client'
import { useWallet } from '../../../context/WalletContext'
import { useConfig } from '../../../api/hooks'
import { sound } from '../../../lib/sound'
import styles from './AddCashModal.module.css'
import base from './modal.module.css'

type Props = { onClose: () => void }

type Method = 'JAZZCASH' | 'EASYPAISA' | 'BANK' | 'WEGARS'
type Channel = { id: string; method: Method; accountNumber: string; accountTitle: string; bankName?: string; instructions?: string; minAmount?: number; maxAmount?: number }
type BonusEstimate = { pct: number; bonusAmount: number; label: string }

const METHOD_LABEL: Record<Method, string> = { JAZZCASH: 'Jazzcash', EASYPAISA: 'Easypaisa', BANK: 'Bank', WEGARS: 'Wegars' }
const ALL_METHODS: Method[] = ['JAZZCASH', 'EASYPAISA', 'BANK', 'WEGARS']
const FALLBACK_PRESETS = [300, 500, 1000, 2000, 4000, 5000, 10000, 20000, 50000]

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #8b6914', background: '#1a0505', color: '#fff', fontSize: 13 }

export default function AddCashModal({ onClose }: Props) {
  const { refresh } = useWallet()
  const config = useConfig()
  const minDep = config?.limits.minDeposit ?? 300
  const maxDep = config?.limits.maxDeposit ?? 100000
  const presets = config?.depositPresets?.length ? config.depositPresets : FALLBACK_PRESETS
  const enabledMethods = useMemo(() => {
    if (!config?.methods) return ALL_METHODS
    return ALL_METHODS.filter((m) => config.methods[m])
  }, [config])

  const [step, setStep] = useState<1 | 2>(1)
  const [method, setMethod] = useState<Method>(enabledMethods[0] ?? 'JAZZCASH')
  const [channels, setChannels] = useState<Channel[]>([])
  const [channel, setChannel] = useState<Channel | null>(null)
  const [amount, setAmount] = useState(minDep)
  const [bonusEst, setBonusEst] = useState<BonusEstimate | null>(null)
  const [trxId, setTrxId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (enabledMethods.length && !enabledMethods.includes(method)) setMethod(enabledMethods[0])
  }, [enabledMethods, method])

  useEffect(() => {
    setChannel(null)
    api
      .get(`/payment-channels?method=${method}`)
      .then((list: Channel[]) => {
        setChannels(list)
        setChannel(list[0] ?? null)
      })
      .catch(() => setChannels([]))
  }, [method])

  useEffect(() => {
    api
      .get(`/deposits/bonus-estimate?amount=${amount}`)
      .then(setBonusEst)
      .catch(() => setBonusEst(null))
  }, [amount])

  const bonus = Math.round(bonusEst?.bonusAmount ?? 0)
  const effectiveMax = channel?.maxAmount ? Math.min(maxDep, channel.maxAmount / 100) : maxDep
  const effectiveMin = channel?.minAmount ? Math.max(minDep, channel.minAmount / 100) : minDep

  function copy(t: string) {
    navigator.clipboard?.writeText(t).catch(() => {})
    setMsg('Copied')
    window.setTimeout(() => setMsg(null), 1200)
  }

  function goPay() {
    if (amount < effectiveMin) return setMsg(`Minimum deposit is Rs ${effectiveMin}`)
    if (amount > effectiveMax) return setMsg(`Maximum deposit is Rs ${effectiveMax}`)
    if (!channel) return setMsg('No payment account available for this method')
    setMsg(null)
    setStep(2)
  }

  async function submit() {
    if (!trxId.trim()) return setMsg('Enter the Transaction ID')
    setBusy(true)
    setMsg(null)
    try {
      let receiptUrl: string | undefined
      if (file) {
        const media = await uploadFile(file)
        receiptUrl = media.url
      }
      await api.post('/deposits', { amount, method, channelId: channel?.id, trxId: trxId.trim(), receiptUrl })
      sound.play('success')
      setDone(true)
      refresh()
    } catch (e: any) {
      sound.play('error')
      setMsg(e?.message || 'Deposit failed')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <S9ModalShell title="Add Cash" onClose={onClose} wide hideSupport>
        <div style={{ padding: '30px 20px', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 46 }}>✅</div>
          <h3 style={{ color: '#8bd98b', margin: '10px 0' }}>Deposit submitted</h3>
          <p style={{ fontSize: 13, color: '#e8d0a0' }}>
            Your deposit of <b>Rs {amount}</b> is pending agent confirmation. Your wallet will be credited and you'll get a
            notification once the agent confirms the payment.
          </p>
          <button className={styles.payBtn} style={{ marginTop: 16 }} onClick={onClose}>Done</button>
        </div>
      </S9ModalShell>
    )
  }

  if (!enabledMethods.length) {
    return (
      <S9ModalShell title="Add Cash" onClose={onClose} wide hideSupport>
        <p style={{ padding: 20, color: '#ff8a80', textAlign: 'center' }}>All deposit methods are currently disabled.</p>
      </S9ModalShell>
    )
  }

  return (
    <S9ModalShell title="Add Cash" onClose={onClose} wide hideSupport>
      {step === 1 ? (
        <>
          <p className={base.sectionTitle}><span>💰</span> Amount</p>
          <div style={{ display: 'flex', gap: 6, padding: '0 12px 8px', flexWrap: 'wrap' }}>
            {presets.filter((p) => p >= effectiveMin && p <= effectiveMax).map((p) => (
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
              min={effectiveMin}
              max={effectiveMax}
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
              <button key={m} type="button" className={method === m ? styles.tabOn : styles.tab} onClick={() => setMethod(m)}>
                {METHOD_LABEL[m]}
              </button>
            ))}
          </div>

          <p className={base.sectionTitle}><span>🏦</span> Send payment to this account</p>
          {channels.length > 1 && (
            <div style={{ display: 'flex', gap: 6, padding: '0 12px 8px', flexWrap: 'wrap' }}>
              {channels.map((c) => (
                <button key={c.id} type="button" onClick={() => setChannel(c)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #8b6914', fontSize: 11, fontWeight: 700, background: channel?.id === c.id ? '#e65100' : 'transparent', color: channel?.id === c.id ? '#fff' : '#c9a24a' }}>
                  {c.accountNumber}
                </button>
              ))}
            </div>
          )}
          <div style={{ padding: '0 12px' }}>
            {channel ? (
              <div style={{ border: '1px solid #8b6914', borderRadius: 10, padding: 12, background: 'rgba(0,0,0,.25)' }}>
                {([
                  ['Account No', channel.accountNumber, true],
                  ['Account Title', channel.accountTitle, false],
                  ...(channel.bankName ? [['Bank', channel.bankName, false] as [string, string, boolean]] : []),
                ] as [string, string, boolean][]).map(([k, v, c]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: '#c9a24a', fontSize: 12, width: 90 }}>{k}</span>
                    <b style={{ color: '#fff', fontSize: 14, flex: 1 }}>{v}</b>
                    {c && <button type="button" onClick={() => copy(v)} style={{ background: '#e65100', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>copy</button>}
                  </div>
                ))}
                {channel.instructions && <p style={{ color: '#e8d0a0', fontSize: 11, margin: '4px 0 0' }}>{channel.instructions}</p>}
              </div>
            ) : (
              <p style={{ color: '#ff8a80', fontSize: 12 }}>No {METHOD_LABEL[method]} account available right now.</p>
            )}
          </div>

          {msg && <p style={{ color: msg === 'Copied' ? '#8bd98b' : '#ff8a80', fontSize: 12, padding: '6px 12px', margin: 0 }}>{msg}</p>}

          <div className={styles.footer}>
            <button type="button" className={styles.payBtn} onClick={goPay} disabled={!channel}>I've sent the payment →</button>
          </div>
        </>
      ) : (
        <>
          <p className={base.sectionTitle}><span>🧾</span> Confirm your payment</p>
          <div style={{ padding: '0 12px', color: '#e8d0a0', fontSize: 13 }}>
            You are depositing <b style={{ color: '#fff' }}>Rs {amount}</b> via <b style={{ color: '#fff' }}>{METHOD_LABEL[method]}</b> to <b style={{ color: '#fff' }}>{channel?.accountNumber}</b>.
          </div>

          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="Transaction ID (TID)" value={trxId} onChange={(e) => setTrxId(e.target.value)} style={inputStyle} />
            <label style={{ color: '#c9a24a', fontSize: 12 }}>
              Upload payment screenshot (optional)
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ ...inputStyle, marginTop: 4, padding: 8 }} />
            </label>
            {file && <span style={{ color: '#8bd98b', fontSize: 11 }}>📎 {file.name}</span>}
          </div>

          {msg && <p style={{ color: '#ff8a80', fontSize: 12, padding: '6px 12px', margin: 0 }}>{msg}</p>}

          <div className={styles.footer} style={{ gap: 8 }}>
            <button type="button" className={styles.tab} style={{ flex: 1 }} onClick={() => setStep(1)}>Back</button>
            <button type="button" className={styles.payBtn} style={{ flex: 2 }} onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit deposit'}</button>
          </div>
        </>
      )}
    </S9ModalShell>
  )
}
