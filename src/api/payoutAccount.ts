export type PayoutMethod = 'JAZZCASH' | 'EASYPAISA' | 'BANK' | 'WEGARS'

export type PayoutAccount = {
  method: PayoutMethod
  title: string
  number: string
  bank?: string
}

const KEY = 'zee9-payout-account'

export function savePayoutAccount(userId: string, account: PayoutAccount) {
  try {
    localStorage.setItem(`${KEY}:${userId}`, JSON.stringify(account))
  } catch {
    /* ignore */
  }
}

export function loadPayoutAccount(userId: string): PayoutAccount | null {
  try {
    const raw = localStorage.getItem(`${KEY}:${userId}`)
    return raw ? (JSON.parse(raw) as PayoutAccount) : null
  } catch {
    return null
  }
}

export function maskAccountNumber(num: string): string {
  const digits = num.replace(/\D/g, '')
  if (digits.length < 4) return num
  return `**** ***${digits.slice(-4, -1)} ${digits.slice(-1)}`
}

export const METHOD_LABEL: Record<PayoutMethod, string> = {
  JAZZCASH: 'Jazz Cash',
  EASYPAISA: 'Easypaisa',
  BANK: 'Bank',
  WEGARS: 'Wegars',
}
