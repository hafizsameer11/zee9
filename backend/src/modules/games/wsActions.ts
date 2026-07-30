import type { WebSocket } from 'ws'
import { AppError } from '../../core/errors.js'

export function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState !== ws.OPEN) return
  try {
    ws.send(JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

type ActionHandler = (msg: any) => Promise<unknown>

/**
 * Handle request/response game actions over an existing game WS.
 * Client sends: { action, id?, ...payload } (legacy: { type, id?, ...payload })
 * Prefer `action` so payload `type` (e.g. Wingo color/number) is preserved.
 * Server replies: { type: 'result', id, ok, data? | error? }
 */
export async function dispatchWsAction(
  ws: WebSocket,
  msg: any,
  actions: Record<string, ActionHandler>,
  opts?: { afterOk?: () => void },
) {
  const type = String(msg?.action || msg?.type || '')
  if (!type || type === 'ping' || type === 'refresh' || type === 'pong') return false

  const id = msg.id ?? null
  const handler = actions[type]
  if (!handler) {
    // Always reply when the client is awaiting a result — otherwise it hangs
    // until the 15s "Request timeout" on the socket client.
    if (id != null) {
      sendJson(ws, { type: 'result', id, ok: false, error: `Unknown action: ${type}` })
    }
    return false
  }

  try {
    const data = await handler(msg)
    sendJson(ws, { type: 'result', id, ok: true, data })
    opts?.afterOk?.()
  } catch (err: any) {
    const message =
      err instanceof AppError
        ? err.message
        : typeof err?.message === 'string'
          ? err.message
          : 'Action failed'
    sendJson(ws, { type: 'result', id, ok: false, error: message })
  }
  return true
}
