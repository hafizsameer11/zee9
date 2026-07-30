/** Merchant confirm window: 1 hour after player submits TRX ID. */
export const CONFIRM_WINDOW_MS = 60 * 60 * 1000
/** Player must submit TRX within 5 minutes of order create. */
export const PAY_WINDOW_MS = 5 * 60 * 1000

export function mmss(sec: number) {
  const m = Math.floor(Math.max(0, sec) / 60)
  const s = Math.max(0, sec) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function isOpenOrderStatus(status: string) {
  return status === 'pending' || status === 'checking' || status === 'processing'
}

/** Start of 1h window — only when player has submitted TRX (`submittedAt`). */
export function confirmWindowStartMs(submittedAt?: string | null): number {
  if (!submittedAt) return 0
  const start = Date.parse(submittedAt)
  return Number.isFinite(start) ? start : 0
}

export function confirmRemainSec(submittedAt: string | null | undefined, nowMs: number): number {
  const start = confirmWindowStartMs(submittedAt)
  if (!start) return 0
  return Math.max(0, Math.floor((start + CONFIRM_WINDOW_MS - nowMs) / 1000))
}

/** Show live 1h countdown only while order is open AND TRX was submitted. */
export function shouldShowConfirmCountdown(status: string, submittedAt?: string | null) {
  return isOpenOrderStatus(status) && Boolean(submittedAt)
}

/** 5-minute window from order create until player submits TRX. */
export function payRemainSec(createdAt: string | null | undefined, nowMs: number): number {
  if (!createdAt) return 0
  const start = Date.parse(createdAt)
  if (!Number.isFinite(start)) return 0
  return Math.max(0, Math.floor((start + PAY_WINDOW_MS - nowMs) / 1000))
}

/** Waiting for player TRX — show 5m countdown. */
export function shouldShowPayCountdown(
  status: string,
  submittedAt?: string | null,
  trxId?: string | null,
) {
  if (!isOpenOrderStatus(status)) return false
  if (submittedAt || (trxId && String(trxId).trim())) return false
  return true
}
