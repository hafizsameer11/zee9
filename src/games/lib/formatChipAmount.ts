/** Compact denomination text shared by every betting-chip renderer. */
export function formatChipAmount(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (Math.abs(value) < 1000) return String(Math.round(value))

  const thousands = value / 1000
  const digits = Number.isInteger(thousands) ? 0 : thousands < 10 ? 1 : 0
  return `${thousands.toFixed(digits).replace(/\.0$/, '')}K`
}
