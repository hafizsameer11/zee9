import type { ReferralParams } from './auth'

const KEY = 'zee9-referral'

/**
 * Capture referral/channel params from the share URL, e.g.
 *   /?channel=14&userId=3751642&shareCode=3751642&bindCode=700
 * Persisted so they survive the splash → login navigation.
 */
export function captureReferral() {
  try {
    const p = new URLSearchParams(window.location.search)
    const shareCode = p.get('shareCode') || p.get('userId') || p.get('ref') || p.get('code') || undefined
    const channel = p.get('channel') || undefined
    const bindCode = p.get('bindCode') || undefined
    if (shareCode || channel || bindCode) {
      const data: ReferralParams = { shareCode: shareCode || undefined, channel, bindCode }
      localStorage.setItem(KEY, JSON.stringify(data))
    }
  } catch {
    /* ignore */
  }
}

export function getReferral(): ReferralParams {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ReferralParams) : {}
  } catch {
    return {}
  }
}

export function clearReferral() {
  localStorage.removeItem(KEY)
}
