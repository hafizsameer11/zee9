import { S9_GAMES } from '../data/s9Games'
import AviatorGame from './components/AviatorGame'
import CrashGame from './components/CrashGame'
import MinesGame from './components/MinesGame'
import MoneyComingGame from './components/MoneyComingGame'
import WingoGame from './components/WingoGame'
import WingoLotteryGame from './components/WingoLotteryGame'
import AeroXGame from './aero-x'
import BountyTrailGame from './bounty-trail'
import ChickenRoadGame from './chicken-road'
import DoubleCrashGame from './double-crash'
import DoubleFortuneGame from './double-fortune'
import CarRouletteGame from './car-roulette'
import ZooRouletteGame from './zoo-roulette'
import DragonTigerGame from './dragon-tiger'
import FortuneGems2Game from './fortune-gems-2'
import RouletteGame from './roulette'
import JhandiMundaGame from './jhandi-munda'
import SevenUpDownGame from './7up-down'
import SuperAceGame from './super-ace'
import type { GameEntry } from './types'

export const PLAYABLE_GAME_IDS = new Set<string>([
  'fortune-gems-2',
  'wingo-lottery',
  'wingo',
  'aviator',
  'crash',
  'mines',
  '7up-down',
  'money-coming',
  'roulette',
  'dragon-tiger',
  'chicken-road',
  'bounty-trail',
  'wild-bounty',
  'aero-x',
  'double-crash',
  'super-ace',
  'double-fortune',
  'car-roulette',
  'zoo-roulette',
])

/** Games that stay in true phone portrait (no 90° landscape rotate). */
export const PORTRAIT_GAME_IDS = new Set<string>([
  'wingo',
  'bounty-trail',
  'wild-bounty',
  'super-ace',
  'double-fortune',
  'jhandi-munda',
])

export function isPortraitGame(id: string): boolean {
  return PORTRAIT_GAME_IDS.has(id)
}

function titleFor(id: string): string {
  return S9_GAMES.find((g) => g.id === id)?.name ?? id
}

function buildRegistry(): Record<string, GameEntry> {
  return {
    mines: { component: MinesGame, title: titleFor('mines'), engine: 'mines' },
    aviator: { component: AviatorGame, title: titleFor('aviator'), engine: 'crash' },
    crash: { component: CrashGame, title: titleFor('crash'), engine: 'crash' },
    'wingo-lottery': { component: WingoLotteryGame, title: titleFor('wingo-lottery'), engine: 'wingo' },
    wingo: { component: WingoGame, title: titleFor('wingo'), engine: 'wingo' },
    '7up-down': { component: SevenUpDownGame, title: titleFor('7up-down'), engine: 'dice' },
    'money-coming': { component: MoneyComingGame, title: titleFor('money-coming'), engine: 'slot' },
    roulette: { component: RouletteGame, title: titleFor('roulette'), engine: 'roulette' },
    'dragon-tiger': {
      component: DragonTigerGame,
      title: titleFor('dragon-tiger'),
      engine: 'dragon-tiger',
    },
    'chicken-road': {
      component: ChickenRoadGame,
      title: titleFor('chicken-road'),
      engine: 'chicken-road',
    },
    'bounty-trail': {
      component: BountyTrailGame,
      title: titleFor('bounty-trail'),
      engine: 'slot',
    },
    'wild-bounty': {
      component: BountyTrailGame,
      title: titleFor('wild-bounty'),
      engine: 'slot',
    },
    'aero-x': { component: AeroXGame, title: titleFor('aero-x'), engine: 'crash' },
    'double-crash': {
      component: DoubleCrashGame,
      title: titleFor('double-crash'),
      engine: 'crash',
    },
    'fortune-gems-2': {
      component: FortuneGems2Game,
      title: titleFor('fortune-gems-2'),
      engine: 'slot',
    },
    'super-ace': { component: SuperAceGame, title: titleFor('super-ace'), engine: 'slot' },
    'double-fortune': {
      component: DoubleFortuneGame,
      title: titleFor('double-fortune'),
      engine: 'slot',
    },
    'car-roulette': {
      component: CarRouletteGame,
      title: titleFor('car-roulette'),
      engine: 'roulette',
    },
    'zoo-roulette': {
      component: ZooRouletteGame,
      title: titleFor('zoo-roulette'),
      engine: 'roulette',
    },
    'jhandi-munda': {
      component: JhandiMundaGame,
      title: titleFor('jhandi-munda'),
      engine: 'dice',
    },
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
