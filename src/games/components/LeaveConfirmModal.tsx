import styles from './leaveConfirmModal.module.css'

function formatStake(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export type LeaveConfirmModalProps = {
  open: boolean
  stakeAmount?: number
  canCashOut?: boolean
  cashOutAmount?: number
  onStay: () => void
  onCashOutAndLeave?: () => void | Promise<void>
  onLeaveAnyway: () => void
}

export default function LeaveConfirmModal({
  open,
  stakeAmount,
  canCashOut,
  cashOutAmount,
  onStay,
  onCashOutAndLeave,
  onLeaveAnyway,
}: LeaveConfirmModalProps) {
  if (!open) return null

  const stakeText =
    stakeAmount != null && stakeAmount > 0
      ? `Your Rs ${formatStake(stakeAmount)} stake is still active.`
      : 'Your bet is still active.'

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="leave-title">
      <button type="button" className={styles.backdrop} onClick={onStay} aria-label="Close" />
      <div className={styles.panel}>
        <h2 id="leave-title">Leave this round?</h2>
        <p>{stakeText} If you leave now, you will lose your bet.</p>
        <div className={styles.actions}>
          {canCashOut && onCashOutAndLeave && (
            <button
              type="button"
              className={styles.primary}
              onClick={() => void onCashOutAndLeave()}
            >
              {cashOutAmount != null && cashOutAmount > 0
                ? `Cash out Rs ${formatStake(cashOutAmount)} and leave`
                : 'Cash out and leave'}
            </button>
          )}
          <button type="button" onClick={onStay}>
            Keep playing
          </button>
          <button type="button" className={styles.danger} onClick={onLeaveAnyway}>
            Leave anyway
          </button>
        </div>
      </div>
    </div>
  )
}
