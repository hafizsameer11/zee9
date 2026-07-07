/** Calibrated from Super9 assets: table 1424×734, zones overlay 1055×348 */
export const TABLE_ASPECT = 1424 / 734

/** Felt / zones overlay box as % of table image */
export const FELT = {
  left: 12.95,
  top: 20.8,
  width: 74.1,
  height: 47.4,
} as const

/** Three zone columns — center (7) is narrower on the overlay art */
export const ZONE_COLS = '1fr 0.62fr 1fr' as const
