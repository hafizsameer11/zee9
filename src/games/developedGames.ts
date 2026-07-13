/**
 * Only Mines has server-side wallet integration. Other games must not
 * manipulate balance locally until their backend engines exist.
 */
export const DEVELOPED_GAME_IDS = new Set<string>(['mines'])

export function isDevelopedGame(id: string): boolean {
  return DEVELOPED_GAME_IDS.has(id)
}
