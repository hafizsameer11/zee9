/** Looping alert beep until stop() — uses alert.wav with WebAudio fallback. */
let audio: HTMLAudioElement | null = null
let fallbackCtx: AudioContext | null = null
let fallbackTimer: number | null = null
let playing = false

function playFallbackBeep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    if (!fallbackCtx) fallbackCtx = new Ctx()
    const ctx = fallbackCtx
    void ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 980
    gain.gain.value = 0.0001
    osc.connect(gain)
    gain.connect(ctx.destination)
    const now = ctx.currentTime
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
    osc.start(now)
    osc.stop(now + 0.4)
  } catch {
    /* ignore */
  }
}

/** Call once after any user gesture so later alerts can autoplay. */
export function unlockAlertSound() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (Ctx) {
      if (!fallbackCtx) fallbackCtx = new Ctx()
      void fallbackCtx.resume()
    }
    if (!audio) {
      audio = new Audio('/alert.wav')
      audio.loop = true
      audio.volume = 0.85
    }
    // Silent play/pause to unlock media element
    const prev = audio.volume
    audio.volume = 0
    void audio
      .play()
      .then(() => {
        audio?.pause()
        if (audio) {
          audio.currentTime = 0
          audio.volume = prev
        }
      })
      .catch(() => {
        if (audio) audio.volume = prev
      })
  } catch {
    /* ignore */
  }
}

/** Alert sound disabled — merchants rely on visual popups only. */
export function startAlertSound() {
  /* intentionally silent */
}

export function stopAlertSound() {
  playing = false
  if (fallbackTimer) {
    window.clearInterval(fallbackTimer)
    fallbackTimer = null
  }
  try {
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
  } catch {
    /* ignore */
  }
}
