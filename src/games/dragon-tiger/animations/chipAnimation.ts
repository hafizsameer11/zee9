/** Lightweight animation timeline helpers for Dragon Tiger. */

export type AnimHandle = { cancel: () => void }

export function runTimeout(fn: () => void, ms: number): AnimHandle {
  const id = window.setTimeout(fn, ms)
  return { cancel: () => window.clearTimeout(id) }
}

export function runRaf(
  duration: number,
  onFrame: (t: number) => void,
  onDone?: () => void,
): AnimHandle {
  let raf = 0
  let cancelled = false
  const start = performance.now()
  const step = (now: number) => {
    if (cancelled) return
    const t = Math.min(1, (now - start) / duration)
    onFrame(t)
    if (t < 1) raf = requestAnimationFrame(step)
    else onDone?.()
  }
  raf = requestAnimationFrame(step)
  return {
    cancel: () => {
      cancelled = true
      cancelAnimationFrame(raf)
    },
  }
}
