/** Premium games with full UI — shown in the lobby for now. */
export const DEVELOPED_GAME_IDS = new Set<string>([
  'mines',
  'aviator',
  'teen-patti',
  'wingo-lottery',
  'wingo',
  'double-crash',
  'crash',
  'fortune-ox',
  '7up-down',
])

export function isDevelopedGame(id: string): boolean {
  return DEVELOPED_GAME_IDS.has(id)
}
