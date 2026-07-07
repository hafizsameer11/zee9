import type { PlayerId } from '../engines/teenPatti'

/** Portrait URLs from Flowstep Teen Patti design export */
export const TEEN_PATTI_AVATARS: Record<PlayerId, string> = {
  you: 'https://images.unsplash.com/photo-1616840420121-7ad8ed885f11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
  bot1: 'https://images.unsplash.com/photo-1629708494720-91f2c75f7604?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
  bot2: 'https://images.unsplash.com/photo-1732888878731-7e52999af144?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
  bot3: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
}

export const HAND_RANK_GUIDE = [
  {
    name: 'Trail',
    sub: 'Three of a kind',
    cards: ['A♦', 'A♥', 'A♣'],
    highlight: true,
  },
  {
    name: 'Pure Seq',
    sub: 'Straight flush',
    cards: ['5♠', '6♠', '7♠'],
    highlight: false,
  },
  {
    name: 'Sequence',
    sub: 'Straight',
    cards: ['8♥', '9♣', 'T♠'],
    highlight: false,
  },
  {
    name: 'Color',
    sub: 'Flush',
    cards: ['2♦', '7♦', 'J♦'],
    highlight: false,
  },
  {
    name: 'Pair',
    sub: 'Two of a kind',
    cards: ['K♣', 'K♥', '4♠'],
    highlight: false,
  },
  {
    name: 'High Card',
    sub: 'No combination',
    cards: ['A♥', '9♠', '3♦'],
    highlight: false,
  },
] as const

export const LIVE_WINS = [
  { name: 'Bilal****92', amount: 42000, hand: 'Trail' },
  { name: 'Simran', amount: 15250, hand: 'Pure Seq' },
  { name: 'Arjun', amount: 9800, hand: 'Color' },
  { name: 'Neha', amount: 3360, hand: 'Pair' },
]
