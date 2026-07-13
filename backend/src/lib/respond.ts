import type { Response } from 'express'
import { serializeBigInts } from './money.js'

/** Standard success envelope. BigInts are converted to numbers (paisa). */
export function ok(res: Response, data: unknown, status = 200) {
  res.status(status).json({ ok: true, data: serializeBigInts(data) })
}
