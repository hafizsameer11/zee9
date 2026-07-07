/** Premium games with full S9-style UI — shown in the lobby. */
export const DEVELOPED_GAME_IDS = new Set<string>([
  'fortune-gems',
  'fortune-ox',
  'wingo-lottery',
  'wingo',
  'aviator',
  'crash',
  'mines',
  '7up-down',
])

export function isDevelopedGame(id: string): boolean {
  return DEVELOPED_GAME_IDS.has(id)
}
