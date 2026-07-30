/**
 * Games shown in lobby / category grids and allowed to open from home.
 * Keep in sync with PLAYABLE_GAME_IDS in registry.ts.
 */
export const DEVELOPED_GAME_IDS = new Set<string>([
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
])

export function isDevelopedGame(id: string): boolean {
  return DEVELOPED_GAME_IDS.has(id)
}
