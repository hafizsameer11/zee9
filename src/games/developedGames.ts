/**
 * Games shown in lobby / category grids and allowed to open from home.
 * Keep in sync with PLAYABLE_GAME_IDS in registry.ts.
 */
export const DEVELOPED_GAME_IDS = new Set<string>([
  'mines',
  'aviator',
  'crash',
  'wingo-lottery',
  'wingo',
  '7up-down',
  'fortune-ox',
  'fortune-gems',
])

export function isDevelopedGame(id: string): boolean {
  return DEVELOPED_GAME_IDS.has(id)
}
