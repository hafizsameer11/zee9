import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, uploadFile } from '../api/client'
import { useWallet } from '../context/WalletContext'
import { sound } from '../lib/sound'
import styles from './C2cPaymentPage.module.css'

type PayInfo = {
  depositId: string
  orderNo: string
  amount: number
  method: string
  status: string
  orderStatus: string
  trxId: string | null
  expiresAt: string
  account: {
    number: string
    title: string
    method: string
    instructions: string[]
  } | null
}

function methodLabel(m: string) {
  if (m === 'JAZZCASH') return 'JazzCash'
  if (m === 'EASYPAISA') return 'Easypaisa'
  return m
}

function formatRemain(ms: number) {
  if (ms <= 0) return '00:00'
  const s = Math.ceil(ms / 1000)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export default function C2cPaymentPage() {
  const { orderNo: paramOrder } = useParams()
  const [qs] = useSearchParams()
  const orderNo = paramOrder || qs.get('orderNo') || ''
  const navigate = useNavigate()
  const { refresh } = useWallet()

  const [info, setInfo] = useState<PayInfo | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [trxId, setTrxId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const submitLock = useRef(false)
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(Date.now())

  const load = useCallback(async () => {
    if (!orderNo) {
      setErr('Missing order number')
      setLoading(false)
      return
    }
    try {
      const data = await api.get(`/deposits/order/${encodeURIComponent(orderNo)}`)
      setInfo(data)
      if (data.trxId) setTrxId(data.trxId)
      if (data.status !== 'PENDING' || data.trxId) setDone(true)
    } catch (e: any) {
      setErr(e?.message || 'Payment order not found')
    } finally {
      setLoading(false)
    }
  }, [orderNo])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const remainMs = useMemo(() => {
    if (!info?.expiresAt) return 0
    return new Date(info.expiresAt).getTime() - now
  }, [info, now])

  const expired = remainMs <= 0 && info?.status === 'PENDING' && !done

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  async function submit() {
    if (submitLock.current || busy || done) return
    if (!trxId.trim()) return setErr('Enter the Transaction ID (TID)')
    submitLock.current = true
    setBusy(true)
    setErr('')
    try {
      let receiptUrl: string | undefined
      if (file) {
        const media = await uploadFile(file)
        receiptUrl = media.url
      }
      await api.patch(`/deposits/order/${encodeURIComponent(orderNo)}`, {
        trxId: trxId.trim(),
        receiptUrl,
      })
      sound.play('success')
      setDone(true)
      refresh()
    } catch (e: any) {
      sound.play('error')
      setErr(e?.message || 'Submit failed')
      submitLock.current = false
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>Loading payment…</div>
      </div>
    )
  }

  if (err && !info) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h2>Payment unavailable</h2>
          <p className={styles.muted}>{err}</p>
          <button type="button" className={styles.primary} onClick={() => navigate('/home')}>
            Back to lobby
          </button>
        </div>
      </div>
    )
  }

  if (!info || !info.account) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h2>No account assigned</h2>
          <button type="button" className={styles.primary} onClick={() => navigate('/home')}>
            Back to lobby
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.head}>
          <button type="button" className={styles.back} onClick={() => navigate('/home')} aria-label="Back">
            ←
          </button>
          <div>
            <div className={styles.brand}>Zee9 Pay</div>
            <div className={styles.order}>Order {info.orderNo}</div>
          </div>
          <div className={`${styles.timer}${expired ? ` ${styles.timerDead}` : ''}`}>
            {expired ? 'Expired' : formatRemain(remainMs)}
          </div>
        </header>

        <div className={styles.amountBox}>
          <div className={styles.amountLabel}>Pay exactly</div>
          <div className={styles.amount}>Rs {info.amount.toLocaleString('en-PK')}</div>
          <div className={styles.methodPill}>{methodLabel(info.method)} · C2C</div>
        </div>

        {done ? (
          <div className={styles.success}>
            <div className={styles.successIcon}>✓</div>
            <h3>Payment submitted</h3>
            <p>
              Your deposit is waiting for merchant confirmation. Wallet will update once approved.
            </p>
            <button type="button" className={styles.primary} onClick={() => navigate('/home')}>
              Back to lobby
            </button>
          </div>
        ) : (
          <>
            <section className={styles.account}>
              <div className={styles.row}>
                <span>Account name</span>
                <b>{info.account.title}</b>
              </div>
              <div className={styles.row}>
                <span>Account number</span>
                <div className={styles.numRow}>
                  <b className={styles.number}>{info.account.number}</b>
                  <button type="button" className={styles.copy} onClick={() => copy(info.account!.number)}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </section>

            <section className={styles.howto}>
              <h4>How to pay</h4>
              <ol>
                {(info.account.instructions || []).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className={styles.warn}>
                Send the <b>exact amount</b>. A new merchant account is assigned each time you create a deposit.
              </p>
            </section>

            {expired ? (
              <div className={styles.expired}>
                <p>This payment window has expired.</p>
                <button type="button" className={styles.primary} onClick={() => navigate('/home')}>
                  Create a new deposit
                </button>
              </div>
            ) : (
              <section className={styles.proof}>
                <label>
                  Transaction ID (TID)
                  <input
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    placeholder="e.g. 1234567890"
                  />
                </label>
                <label>
                  Screenshot (optional)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {file && <div className={styles.fileName}>📎 {file.name}</div>}
                {err && <p className={styles.error}>{err}</p>}
                <button type="button" className={styles.primary} disabled={busy} onClick={() => void submit()}>
                  {busy ? 'Submitting…' : 'I have paid'}
                </button>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
