import { createGameSocket, type GameSocketHandlers } from './createGameSocket'

export type WingoSocketHandlers = GameSocketHandlers & {
  onState: (state: any) => void
}

export function connectWingoSocket(mode: string, handlers: WingoSocketHandlers) {
  let currentMode = mode
  let sock = createGameSocket(
    `/games/wingo/ws?mode=${encodeURIComponent(currentMode)}`,
    handlers,
  )

  return {
    request: <T = any>(type: string, payload: Record<string, unknown> = {}, timeoutMs?: number) =>
      sock.request<T>(type, payload, timeoutMs),
    refresh: () => sock.refresh(),
    ready: () => sock.ready(),
    send: (msg: Record<string, unknown>) => sock.send(msg),
    close: () => sock.close(),
    setMode(next: string) {
      currentMode = next
      if (sock.ready()) {
        sock.send({ type: 'mode', mode: next })
      } else {
        sock.close()
        sock = createGameSocket(
          `/games/wingo/ws?mode=${encodeURIComponent(currentMode)}`,
          handlers,
        )
      }
    },
  }
}
