import type { ReferralParams } from './auth'

const KEY = 'zee9-referral'

/**
 * Capture referral/channel params from the share URL, e.g.
 *   /?playerId=3751642&channel=14&shareCode=3751642&bindCode=AEFA3A37
 * playerId (numeric) is required for attributing the referrer.
 */
export function captureReferral() {
  try {
    const p = new URLSearchParams(window.location.search)
    const playerId = p.get('playerId') || p.get('userId') || undefined
    const shareCode =
      p.get('shareCode') || playerId || p.get('ref') || p.get('code') || undefined
    const channel = p.get('channel') || undefined
    const bindCode = p.get('bindCode') || undefined
    if (playerId || shareCode || channel || bindCode) {
      const data: ReferralParams = {
        playerId: playerId || undefined,
        shareCode: shareCode || undefined,
        channel,
        bindCode,
      }
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
