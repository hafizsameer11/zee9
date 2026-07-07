import { useState, useEffect } from 'react'
import S9ModalShell from './S9ModalShell'
import base from './modal.module.css'

type Props = {
  onClose: () => void
  onConfirm: () => void
}

export default function WithdrawPasswordModal({ onClose, onConfirm }: Props) {
  const [otpTimer, setOtpTimer] = useState(60)

  useEffect(() => {
    const t = setInterval(() => setOtpTimer((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <S9ModalShell title="Withdraw Password" onClose={onClose} hideSupport>
      <p className={base.hint}>📱 OTP SMS will be sent to ********3600</p>

      <div className={base.inputRow}>
        <span className={base.inputIcon}>OTP</span>
        <input className={base.input} type="text" placeholder="Enter OTP" />
        <button type="button" className={base.otpBtn}>{otpTimer}s</button>
      </div>

      <div className={base.inputRow}>
        <span className={base.inputIcon}>🔒</span>
        <input className={base.input} type="password" placeholder="Withdraw Password" />
      </div>

      <div className={base.inputRow}>
        <span className={base.inputIcon}>🔒</span>
        <input className={base.input} type="password" placeholder="Confirm password" />
      </div>

      <button type="button" className={base.confirmBtn} onClick={onConfirm}>Confirm</button>
    </S9ModalShell>
  )
}
