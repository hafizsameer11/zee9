import { S9_GAMES } from '../data/s9Games'
import AviatorGame from './components/AviatorGame'
import CrashGame from './components/CrashGame'
import DoubleCrashGame from './components/DoubleCrashGame'
import DiceGames from './components/DiceGames'
import FishingGame from './components/FishingGame'
import FortuneOxGame from './components/FortuneOxGame'
import MinesGame from './components/MinesGame'
import SlotGame from './components/SlotGame'
import TeenPattiGame from './components/TeenPattiGame'
import UpDownGame from './components/UpDownGame'
import WingoGame from './components/WingoGame'
import type { GameEntry } from './types'

const CRASH_IDS = ['aviator', 'double-crash', 'crash'] as const
const WINGO_IDS = ['wingo-lottery', 'wingo'] as const
const DICE_IDS = ['7up-down', 'black-red', 'jhandi-munda'] as const
const SLOT_IDS = ['mahjong-ways-2', 'fortune-ox', 'crazy777', 'super-ace', 'pinata-wins'] as const
const FISHING_IDS = ['jackpot-fishing', 'ocean-king', 'all-star-fishing'] as const

export const PLAYABLE_GAME_IDS = new Set<string>([
  'mines',
  ...CRASH_IDS,
  ...WINGO_IDS,
  ...DICE_IDS,
  ...SLOT_IDS,
  'teen-patti',
  ...FISHING_IDS,
])

function titleFor(id: string): string {
  return S9_GAMES.find((g) => g.id === id)?.name ?? id
}

function buildRegistry(): Record<string, GameEntry> {
  const map: Record<string, GameEntry> = {}

  map.mines = { component: MinesGame, title: titleFor('mines'), engine: 'mines' }

  map.aviator = { component: AviatorGame, title: titleFor('aviator'), engine: 'crash' }

  map['double-crash'] = { component: DoubleCrashGame, title: titleFor('double-crash'), engine: 'crash' }
  map.crash = { component: CrashGame, title: titleFor('crash'), engine: 'crash' }

  for (const id of WINGO_IDS) {
    map[id] = { component: WingoGame, title: titleFor(id), engine: 'wingo' }
  }

  map['7up-down'] = { component: UpDownGame, title: titleFor('7up-down'), engine: 'dice' }

  for (const id of DICE_IDS) {
    if (id === '7up-down') continue
    map[id] = { component: DiceGames, title: titleFor(id), engine: 'dice' }
  }

  map['fortune-ox'] = { component: FortuneOxGame, title: titleFor('fortune-ox'), engine: 'slot' }

  for (const id of SLOT_IDS) {
    if (id === 'fortune-ox') continue
    map[id] = { component: SlotGame, title: titleFor(id), engine: 'slot' }
  }

  map['teen-patti'] = { component: TeenPattiGame, title: titleFor('teen-patti'), engine: 'teen-patti' }

  for (const id of FISHING_IDS) {
    map[id] = { component: FishingGame, title: titleFor(id), engine: 'fishing' }
  }

  return map
}

export const GAME_REGISTRY = buildRegistry()

export function getGameEntry(id: string): GameEntry | null {
  return GAME_REGISTRY[id] ?? null
}

export function isPlayableGame(id: string): boolean {
  return PLAYABLE_GAME_IDS.has(id)
}

export { isDevelopedGame, DEVELOPED_GAME_IDS } from './developedGames'
