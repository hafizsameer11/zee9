/** Lucky Wheel art assets (generated premium chrome + prizes). */
export const LW = {
  rim: '/ui/lucky-wheel/chrome/rim.png',
  pointer: '/ui/lucky-wheel/chrome/pointer.png',
  crown: '/ui/lucky-wheel/chrome/crown.png',
  spinHub: '/ui/lucky-wheel/chrome/spin-hub.png',
  titleBanner: '/ui/lucky-wheel/chrome/title-banner.png',
  prizes: {
    bike: '/ui/lucky-wheel/prizes/bike.png',
    again: '/ui/lucky-wheel/prizes/again.png',
    giftBlue: '/ui/lucky-wheel/prizes/gift-blue.png',
    phone: '/ui/lucky-wheel/prizes/phone.png',
    cash: '/ui/lucky-wheel/prizes/cash.png',
    lose: '/ui/lucky-wheel/prizes/lose.png',
    giftPurple: '/ui/lucky-wheel/prizes/gift-purple.png',
    laptop: '/ui/lucky-wheel/prizes/laptop.png',
    chest: '/ui/lucky-wheel/prizes/chest.png',
  },
} as const

export type LwPrizeKey = keyof typeof LW.prizes

export function prizeArtFor(label: string, isPhysical: boolean): string {
  const l = label.toLowerCase()
  if (l === 'again' || l.includes('try again') || l.includes('again')) return LW.prizes.again
  if (l.includes('not winning') || l === 'none' || l === 'no win') return LW.prizes.lose
  if (l.includes('laptop')) return LW.prizes.laptop
  if (l.includes('mobile') || l.includes('phone')) return LW.prizes.phone
  if (l.includes('bike') || l.includes('cc') || l.includes('sp-')) return LW.prizes.bike
  if (l.includes('10,000') || l.includes('10000')) return LW.prizes.chest
  if (l.includes('5,000') || l.includes('5000')) return LW.prizes.cash
  if (l.includes('1,000') || l.includes('1000')) return LW.prizes.cash
  if (l.includes('500')) return LW.prizes.giftPurple
  if (l.includes('200')) return LW.prizes.giftBlue
  if (l.includes('100')) return LW.prizes.giftPurple
  if (l.includes('50') || l.includes('20')) return LW.prizes.giftBlue
  if (isPhysical) return LW.prizes.giftBlue
  return LW.prizes.cash
}

/** Premium segment colors — deep casino tones that sit under gold chrome. */
export const SEGMENT_PALETTE = [
  '#4a148c',
  '#b71c1c',
  '#6d1b1b',
  '#3e2723',
  '#c79100',
  '#1b5e20',
  '#00695c',
  '#0d47a1',
  '#283593',
  '#6a1b9a',
]
