import type { BetSelection, PlayingCard, Rank, Suit } from '../constants/gameConfig'
import { TOTAL_RETURN } from '../constants/gameConfig'
import { formatChipAmount } from '../../lib/formatChipAmount'

export const RANK_VALUE: Record<Rank, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
}

export const ALL_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
export const ALL_SUITS: Suit[] = ['S', 'H', 'D', 'C']

export function makeCard(rank: Rank, suit: Suit): PlayingCard {
  return {
    rank,
    suit,
    value: RANK_VALUE[rank],
    id: `${rank}${suit}`,
  }
}

export function isValidCard(card: PlayingCard | null | undefined): card is PlayingCard {
  if (!card) return false
  return (
    ALL_RANKS.includes(card.rank) &&
    ALL_SUITS.includes(card.suit) &&
    card.value === RANK_VALUE[card.rank]
  )
}

export function compareCards(dragon: PlayingCard, tiger: PlayingCard): BetSelection {
  if (dragon.value > tiger.value) return 'dragon'
  if (tiger.value > dragon.value) return 'tiger'
  return 'tie'
}

export function formatChipLabel(v: number): string {
  return formatChipAmount(v)
}

export function cardFaceSrc(card: PlayingCard): string {
  return `/games/dragon-tiger/cards/${card.rank}${card.suit}.png`
}

/** Total return for a winning stake (includes stake). */
export function payoutForBet(selection: BetSelection, amount: number): number {
  return Math.round(amount * TOTAL_RETURN[selection] * 100) / 100
}
