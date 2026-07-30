/** Shared image preload with concurrency + in-memory dedupe + decode wait. */

const cache = new Map<string, Promise<void>>()

function loadOne(src: string): Promise<void> {
  const existing = cache.get(src)
  if (existing) return existing

  const p = new Promise<void>((resolve) => {
    const img = new Image()
    // sync decode so paint won't flash empty after onload
    img.decoding = 'sync'
    const done = () => {
      const finish = () => resolve()
      // Ensure pixels are decoded into memory before we hide the loader
      if (typeof img.decode === 'function') {
        img.decode().then(finish).catch(finish)
      } else {
        finish()
      }
    }
    img.onload = done
    img.onerror = () => resolve() // don't block forever on a missing asset
    img.src = src
    // Already cached by browser — may be complete immediately
    if (img.complete && img.naturalWidth > 0) done()
  })

  cache.set(src, p)
  return p
}

export function preloadImages(
  urls: readonly string[],
  opts?: {
    concurrency?: number
    onProgress?: (loaded: number, total: number) => void
  },
): Promise<void> {
  const unique = [...new Set(urls.filter(Boolean))]
  if (unique.length === 0) {
    opts?.onProgress?.(0, 0)
    return Promise.resolve()
  }

  const concurrency = Math.max(1, opts?.concurrency ?? 6)
  let loaded = 0
  let cursor = 0

  return new Promise((resolve) => {
    let active = 0
    const kick = () => {
      while (active < concurrency && cursor < unique.length) {
        const src = unique[cursor++]!
        active += 1
        void loadOne(src).finally(() => {
          active -= 1
          loaded += 1
          opts?.onProgress?.(loaded, unique.length)
          if (loaded >= unique.length) resolve()
          else kick()
        })
      }
    }
    kick()
  })
}

export function isImageCached(src: string): boolean {
  return cache.has(src)
}

/** True only after our preload finished for this URL in this session. */
export function isImagePreloaded(src: string): boolean {
  return cache.has(src)
}

/** Schedule work when the browser is idle (fallback: timeout). */
export function runWhenIdle(fn: () => void, timeoutMs = 1500) {
  const ric = (window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
  }).requestIdleCallback
  if (typeof ric === 'function') {
    return ric(() => fn(), { timeout: timeoutMs })
  }
  return window.setTimeout(fn, Math.min(800, timeoutMs))
}
