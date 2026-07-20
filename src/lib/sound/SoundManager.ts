import { DEFAULT_PREFS, PREF_KEY, SFX, type SoundPrefs, type SfxId } from './soundIds'

function loadPrefs(): SoundPrefs {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function savePrefs(p: SoundPrefs) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}

class SoundManager {
  private prefs: SoundPrefs = loadPrefs()
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private buffers = new Map<SfxId, AudioBuffer>()
  private loading = new Map<SfxId, Promise<AudioBuffer | null>>()
  private lastClickAt = 0
  private unlockPromise: Promise<void> | null = null

  getPrefs() {
    return { ...this.prefs }
  }

  setPrefs(patch: Partial<SoundPrefs>) {
    this.prefs = { ...this.prefs, ...patch }
    savePrefs(this.prefs)
    if (this.master) {
      this.master.gain.value = Math.max(0, Math.min(1, this.prefs.volume))
    }
  }

  private ensureCtx() {
    if (this.ctx) return this.ctx
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = Math.max(0, Math.min(1, this.prefs.volume))
    this.master.connect(this.ctx.destination)
    return this.ctx
  }

  /** Must run inside a user gesture (click/tap/keydown). */
  async unlock() {
    if (this.unlockPromise) return this.unlockPromise
    this.unlockPromise = (async () => {
      const ctx = this.ensureCtx()
      if (!ctx) return
      try {
        if (ctx.state === 'suspended') await ctx.resume()
      } catch {
        this.unlockPromise = null
        return
      }
      // Warm a few common buffers so first UI clicks aren't silent.
      void this.preload(['click', 'tap', 'softClick', 'coin', 'bet', 'win', 'lose', 'boom', 'gem', 'chip', 'open', 'close', 'whoosh'])
    })()
    return this.unlockPromise
  }

  isUnlocked() {
    return !!this.ctx && this.ctx.state === 'running'
  }

  async preload(ids: SfxId[]) {
    await Promise.all(ids.map((id) => this.loadBuffer(id)))
  }

  private async loadBuffer(id: SfxId): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(id)
    if (cached) return cached
    const pending = this.loading.get(id)
    if (pending) return pending

    const src = SFX[id]
    if (!src) return null

    const job = (async () => {
      try {
        const ctx = this.ensureCtx()
        if (!ctx) return null
        const res = await fetch(src, { cache: 'force-cache' })
        if (!res.ok) return null
        const arr = await res.arrayBuffer()
        const buf = await ctx.decodeAudioData(arr.slice(0))
        this.buffers.set(id, buf)
        return buf
      } catch {
        return null
      } finally {
        this.loading.delete(id)
      }
    })()

    this.loading.set(id, job)
    return job
  }

  play(id: SfxId, opts?: { volume?: number; force?: boolean }) {
    if (!this.prefs.sfx && !opts?.force) return
    const ctx = this.ensureCtx()
    if (!ctx || !this.master) return

    // Resume if needed (still inside gesture when called from click handlers)
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => this.playNow(id, opts?.volume ?? 1))
      return
    }
    this.playNow(id, opts?.volume ?? 1)
  }

  private playNow(id: SfxId, volMul: number) {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return

    const start = (buf: AudioBuffer) => {
      try {
        const src = ctx.createBufferSource()
        src.buffer = buf
        const gain = ctx.createGain()
        // Slightly boost so Mixkit clips cut through phone speakers
        const v = Math.max(0, Math.min(1.5, volMul * 1.15))
        gain.gain.value = v
        src.connect(gain)
        gain.connect(master)
        src.start(0)
      } catch {
        /* ignore */
      }
    }

    const buf = this.buffers.get(id)
    if (buf) {
      start(buf)
      return
    }

    // Fallback: HTMLAudio while buffer loads (still works after unlock)
    void this.loadBuffer(id).then((decoded) => {
      if (decoded && this.ctx?.state === 'running') start(decoded)
      else this.htmlFallback(id, volMul)
    })
  }

  private htmlFallback(id: SfxId, volMul: number) {
    const src = SFX[id]
    if (!src) return
    try {
      const a = new Audio(src)
      a.volume = Math.max(0, Math.min(1, volMul * this.prefs.volume))
      void a.play().catch(() => {})
    } catch {
      /* ignore */
    }
  }

  playClick() {
    const now = Date.now()
    if (now - this.lastClickAt < 35) return
    this.lastClickAt = now
    this.play('softClick', { volume: 0.85 })
  }

  vibrate(ms = 12) {
    if (!this.prefs.vibrate) return
    try {
      navigator.vibrate?.(ms)
    } catch {
      /* ignore */
    }
  }
}

export const sound = new SoundManager()
