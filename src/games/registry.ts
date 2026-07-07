import { S9_GAMES } from '../data/s9Games'
import AviatorGame from './components/AviatorGame'
import CrashGame from './components/CrashGame'
import FortuneGemsGame from './components/FortuneGemsGame'
import FortuneOxGame from './components/FortuneOxGame'
import MinesGame from './components/MinesGame'
import UpDownGame from './components/UpDownGame'
import WingoGame from './components/WingoGame'
import type { GameEntry } from './types'

export const PLAYABLE_GAME_IDS = new Set<string>([
  'fortune-gems',
  'fortune-ox',
  'wingo-lottery',
  'wingo',
  'aviator',
  'crash',
  'mines',
  '7up-down',
])

function titleFor(id: string): string {
  return S9_GAMES.find((g) => g.id === id)?.name ?? id
}

function buildRegistry(): Record<string, GameEntry> {
  return {
    mines: { component: MinesGame, title: titleFor('mines'), engine: 'mines' },
    aviator: { component: AviatorGame, title: titleFor('aviator'), engine: 'crash' },
    crash: { component: CrashGame, title: titleFor('crash'), engine: 'crash' },
    'wingo-lottery': { component: WingoGame, title: titleFor('wingo-lottery'), engine: 'wingo' },
    wingo: { component: WingoGame, title: titleFor('wingo'), engine: 'wingo' },
    '7up-down': { component: UpDownGame, title: titleFor('7up-down'), engine: 'dice' },
    'fortune-ox': { component: FortuneOxGame, title: titleFor('fortune-ox'), engine: 'slot' },
    'fortune-gems': { component: FortuneGemsGame, title: titleFor('fortune-gems'), engine: 'slot' },
  }
}

export const GAME_REGISTRY = buildRegistry()

export function getGameEntry(id: string): GameEntry | null {
  return GAME_REGISTRY[id] ?? null
}

export function isPlayableGame(id: string): boolean {
  return PLAYABLE_GAME_IDS.has(id)
}

export { isDevelopedGame, DEVELOPED_GAME_IDS } from './developedGames'
