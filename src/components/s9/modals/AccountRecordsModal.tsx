import { useEffect, useState } from 'react'
import { api } from '../../../api/client'
import { useWallet } from '../../../context/WalletContext'
import { usePlayerAuth } from '../../../api/auth'
import { sound } from '../../../lib/sound'
import styles from './AccountRecordsModal.module.css'

type Props = {
  onClose: () => void
  onHistory?: () => void
  onVip?: () => void
  onToast?: (msg: string) => void
}

const VIP_THRESHOLDS = [0, 1000, 5000, 15000, 40000, 100000, 200000, 350000, 550000, 800000, 1200000, 1800000, 2500000]

function maskPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.length < 4) return '**********'
  return `${'*'.repeat(Math.max(6, d.length - 4))}${d.slice(-4)}`
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return 'dd/mm/yyyy'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export default function AccountRecordsModal({ onClose, onHistory, onVip, onToast }: Props) {
  const { balance, refresh } = useWallet()
  const { player, refreshPlayer } = usePlayerAuth()
  const [name, setName] = useState(player?.name ?? '')
  const [editingName, setEditingName] = useState(false)
  const [birthday, setBirthday] = useState(player?.birthday ?? '')
  const [editingBday, setEditingBday] = useState(false)
  const [giftCode, setGiftCode] = useState('')
  const [coupon, setCoupon] = useState('')
  const [busy, setBusy] = useState(false)
  const [pwOpen, setPwOpen] = useState<'login' | 'withdraw' | null>(null)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')

  useEffect(() => {
    setName(player?.name ?? '')
    setBirthday(player?.birthday ?? '')
  }, [player?.name, player?.birthday])

  const vipLevel = player?.vipLevel ?? 1
  const deposited = player?.totalDeposited ?? 0
  const prev = VIP_THRESHOLDS[Math.min(vipLevel, VIP_THRESHOLDS.length - 1)] ?? 0
  const next =
    VIP_THRESHOLDS[Math.min(vipLevel + 1, VIP_THRESHOLDS.length - 1)] ??
    VIP_THRESHOLDS[VIP_THRESHOLDS.length - 1]!
  const vipProgress = Math.max(0, deposited - prev)
  const vipTarget = Math.max(1, next - prev)

  const toast = (m: string) => onToast?.(m)

  const saveName = async () => {
    const nextName = name.trim()
    if (nextName.length < 2) return toast('Name too short')
    setBusy(true)
    try {
      await api.patch('/me/profile', { displayName: nextName })
      await refreshPlayer()
      setEditingName(false)
      sound.play('success')
      toast('Name updated')
    } catch (e: any) {
      toast(e?.message || 'Failed to update name')
    } finally {
      setBusy(false)
    }
  }

  const saveBirthday = async () => {
    if (!birthday) return toast('Pick a date')
    setBusy(true)
    try {
      await api.patch('/me/profile', { birthday })
      await refreshPlayer()
      setEditingBday(false)
      sound.play('success')
      toast('Birthday saved')
    } catch (e: any) {
      toast(e?.message || 'Failed to set birthday')
    } finally {
      setBusy(false)
    }
  }

  const copyId = () => {
    const id = String(player?.playerNo ?? '')
    if (!id) return
    navigator.clipboard?.writeText(id).catch(() => {})
    toast('ID copied')
  }

  const redeemGift = async () => {
    if (!giftCode.trim()) return toast('Enter gift code')
    setBusy(true)
    try {
      const res = (await api.post('/me/gift-code/redeem', { code: giftCode.trim() })) as { amount?: number }
      await refresh()
      setGiftCode('')
      sound.play('coin')
      toast(`Gift redeemed: Rs ${res.amount ?? ''}`)
    } catch (e: any) {
      toast(e?.message || 'Invalid gift code')
    } finally {
      setBusy(false)
    }
  }

  const changeLoginPw = async () => {
    if (newPw.length < 6) return toast('New password min 6 chars')
    setBusy(true)
    try {
      await api.post('/auth/change-password', { oldPassword: oldPw, newPassword: newPw })
      setPwOpen(null)
      setOldPw('')
      setNewPw('')
      sound.play('success')
      toast('Login password updated')
    } catch (e: any) {
      toast(e?.message || 'Password change failed')
    } finally {
      setBusy(false)
    }
  }

  const saveWithdrawPin = async () => {
    if (!/^\d{4,6}$/.test(newPin)) return toast('PIN must be 4–6 digits')
    setBusy(true)
    try {
      await api.post('/me/withdraw-pin', {
        pin: newPin,
        ...(player?.hasWithdrawPin ? { oldPin } : {}),
      })
      await refreshPlayer()
      setPwOpen(null)
      setOldPin('')
      setNewPin('')
      sound.play('success')
      toast('Withdraw PIN saved')
    } catch (e: any) {
      toast(e?.message || 'PIN update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        <header className={styles.head}>
          <h2>ACCOUNT RECORDS</h2>
        </header>

        <div className={styles.body}>
          <section className={styles.profileRow}>
            <div className={styles.avatarWrap}>
              <img src="/logo.png" alt="" className={styles.avatar} />
              <span className={styles.changeBadge}>Change</span>
            </div>
            <div className={styles.identity}>
              <div className={styles.nameLine}>
                {editingName ? (
                  <>
                    <input
                      className={styles.inlineInput}
                      value={name}
                      maxLength={40}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                    />
                    <button type="button" className={styles.miniBtn} disabled={busy} onClick={() => void saveName()}>
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    <strong>{player?.name ?? '—'}</strong>
                    <button type="button" className={styles.editIcon} onClick={() => setEditingName(true)} aria-label="Edit name">
                      ✎
                    </button>
                  </>
                )}
              </div>
              <div className={styles.idLine}>
                <span>ID:{player?.playerNo ?? '—'}</span>
                <button type="button" className={styles.copyBtn} onClick={copyId} aria-label="Copy ID">
                  ⎘
                </button>
              </div>
            </div>
          </section>

          <div className={styles.fieldRow}>
            <span className={styles.label}>Birthday</span>
            {editingBday && !player?.birthdaySet ? (
              <div className={styles.fieldActions}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
                <button type="button" className={styles.miniBtn} disabled={busy} onClick={() => void saveBirthday()}>
                  Save
                </button>
              </div>
            ) : (
              <div className={styles.fieldActions}>
                <span>{fmtDate(player?.birthday)}</span>
                {!player?.birthdaySet && (
                  <button type="button" className={styles.editIcon} onClick={() => setEditingBday(true)} aria-label="Edit birthday">
                    ✎
                  </button>
                )}
              </div>
            )}
          </div>
          <p className={styles.note}>Note: It can only be modified once.</p>

          <div className={styles.fieldRow}>
            <span className={styles.label}>Balance</span>
            <div className={styles.fieldActions}>
              <strong className={styles.bal}>{balance.toFixed(2)}</strong>
              <button type="button" className={styles.greenBtn} onClick={() => onHistory?.()}>
                Records
              </button>
            </div>
          </div>

          <div className={styles.vipCard}>
            <div className={styles.vipLeft}>
              <span className={styles.vipBadge}>V{vipLevel}</span>
              <div className={styles.vipBar}>
                <div
                  className={styles.vipFill}
                  style={{ width: `${Math.min(100, (vipProgress / vipTarget) * 100)}%` }}
                />
              </div>
              <span className={styles.vipText}>
                {Math.floor(vipProgress)}/{vipTarget}
              </span>
            </div>
            <button type="button" className={styles.greenBtn} onClick={() => onVip?.()}>
              Level Up
            </button>
          </div>

          <div className={styles.redeemRow}>
            <span className={styles.redeemLabel}>GIFT CODE</span>
            <input
              className={styles.redeemInput}
              placeholder="Enter code"
              value={giftCode}
              onChange={(e) => setGiftCode(e.target.value)}
            />
            <button type="button" className={styles.blueBtn} disabled={busy} onClick={() => void redeemGift()}>
              Redeem
            </button>
          </div>

          <div className={styles.redeemRow}>
            <span className={styles.redeemLabel}>CouPon</span>
            <input
              className={styles.redeemInput}
              placeholder="Enter coupon"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
            />
            <button
              type="button"
              className={styles.blueBtn}
              onClick={() => {
                if (!coupon.trim()) return toast('Enter coupon')
                toast('Coupon not available yet')
              }}
            >
              Enter
            </button>
          </div>

          <div className={styles.secRow}>
            <span>Withdraw Password</span>
            <button type="button" className={styles.greenBtn} onClick={() => setPwOpen('withdraw')}>
              Reset
            </button>
          </div>
          <div className={styles.secRow}>
            <span>Login Password</span>
            <button type="button" className={styles.greenBtn} onClick={() => setPwOpen('login')}>
              Reset
            </button>
          </div>
          <div className={styles.secRow}>
            <span>Linked Phone</span>
            <span className={styles.phone}>{maskPhone(player?.phone ?? '')}</span>
          </div>
        </div>

        <button type="button" className={styles.closeX} onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      {pwOpen && (
        <div className={styles.subOverlay} role="dialog">
          <div className={styles.subPanel}>
            <h3>{pwOpen === 'login' ? 'Login Password' : 'Withdraw PIN'}</h3>
            {pwOpen === 'login' ? (
              <>
                <input
                  type="password"
                  className={styles.pwInput}
                  placeholder="Current password"
                  value={oldPw}
                  onChange={(e) => setOldPw(e.target.value)}
                />
                <input
                  type="password"
                  className={styles.pwInput}
                  placeholder="New password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
                <div className={styles.subActions}>
                  <button type="button" className={styles.miniBtn} onClick={() => setPwOpen(null)}>
                    Cancel
                  </button>
                  <button type="button" className={styles.greenBtn} disabled={busy} onClick={() => void changeLoginPw()}>
                    Save
                  </button>
                </div>
              </>
            ) : (
              <>
                {player?.hasWithdrawPin && (
                  <input
                    type="password"
                    inputMode="numeric"
                    className={styles.pwInput}
                    placeholder="Current PIN"
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value)}
                  />
                )}
                <input
                  type="password"
                  inputMode="numeric"
                  className={styles.pwInput}
                  placeholder="New PIN (4–6 digits)"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                />
                <div className={styles.subActions}>
                  <button type="button" className={styles.miniBtn} onClick={() => setPwOpen(null)}>
                    Cancel
                  </button>
                  <button type="button" className={styles.greenBtn} disabled={busy} onClick={() => void saveWithdrawPin()}>
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
