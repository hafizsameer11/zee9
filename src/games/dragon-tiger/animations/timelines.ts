import gsap from 'gsap'
import type { RefObject } from 'react'

export type TimelineHandle = { kill: () => void }

function safeKill(tl: gsap.core.Animation | null) {
  if (tl) tl.kill()
}

function q(root: HTMLElement, sel: string) {
  return root.querySelector(sel) as HTMLElement | null
}

function qa(root: HTMLElement, sel: string) {
  return Array.from(root.querySelectorAll(sel)) as HTMLElement[]
}

/** Subtle layered idle for dragon header composition. */
export function playDragonIdle(
  root: HTMLElement | null,
  reduced = false,
): TimelineHandle {
  if (!root || reduced) return { kill: () => {} }
  const mistB = q(root, '[data-layer="mist-back"]')
  const mistF = q(root, '[data-layer="mist-front"]')
  const glow = q(root, '[data-layer="glow"]')
  const base = q(root, '[data-layer="base"]')

  const targets = [mistB, mistF, glow, base].filter(Boolean)
  const tl = gsap.timeline({ repeat: -1 })
  if (base) {
    tl.to(base, { y: -2.5, duration: 1.7, ease: 'sine.inOut' }, 0)
    tl.to(base, { y: 0, duration: 1.7, ease: 'sine.inOut' })
  }
  if (mistB) gsap.to(mistB, { x: 8, opacity: 0.85, duration: 2.8, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  if (mistF) gsap.to(mistF, { x: -6, opacity: 0.65, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  if (glow) gsap.to(glow, { opacity: 0.85, scale: 1.06, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '40% 50%' })

  return {
    kill: () => {
      safeKill(tl)
      gsap.killTweensOf(targets)
    },
  }
}

export function playTigerIdle(
  root: HTMLElement | null,
  reduced = false,
): TimelineHandle {
  if (!root || reduced) return { kill: () => {} }
  const smokeB = q(root, '[data-layer="smoke-back"]')
  const smokeF = q(root, '[data-layer="smoke-front"]')
  const glow = q(root, '[data-layer="glow"]')
  const base = q(root, '[data-layer="base"]')

  const targets = [smokeB, smokeF, glow, base].filter(Boolean)
  const tl = gsap.timeline({ repeat: -1 })
  if (base) {
    tl.to(base, { y: -2, duration: 1.55, ease: 'sine.inOut' }, 0)
    tl.to(base, { y: 0, duration: 1.55, ease: 'sine.inOut' })
  }
  if (smokeB) gsap.to(smokeB, { x: -8, opacity: 0.85, duration: 2.5, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  if (smokeF) gsap.to(smokeF, { x: 6, opacity: 0.65, duration: 2.0, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  if (glow) gsap.to(glow, { opacity: 0.9, scale: 1.08, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '60% 50%' })

  return {
    kill: () => {
      safeKill(tl)
      gsap.killTweensOf(targets)
    },
  }
}

function animateSparks(tl: gsap.core.Timeline, sparks: HTMLElement[], startAt: number) {
  sparks.forEach((el, i) => {
    const driftX = (i % 2 === 0 ? -1 : 1) * (10 + i * 8)
    gsap.set(el, { autoAlpha: 0, y: 28, x: 0, scale: 0.4 })
    tl.to(
      el,
      {
        autoAlpha: 1,
        y: -40 - i * 14,
        x: driftX,
        scale: 1,
        duration: 0.55,
        ease: 'power2.out',
      },
      startAt + i * 0.06,
    )
    tl.to(
      el,
      {
        autoAlpha: 0,
        y: -70 - i * 18,
        scale: 0.6,
        duration: 0.7,
        ease: 'power1.in',
      },
      startAt + 0.7 + i * 0.08,
    )
  })
}

/**
 * Dragon win — one soft pose rising from mist over the Dragon zone. ~2.8s
 * No trail/ghost layers (those looked like stacked cut-out boxes).
 */
export function playDragonWin(
  root: HTMLElement | null,
  onComplete?: () => void,
  reduced = false,
): TimelineHandle {
  if (!root) {
    onComplete?.()
    return { kill: () => {} }
  }

  const mistB = q(root, '[data-layer="mist-back"]')
  const mistF = q(root, '[data-layer="mist-front"]')
  const pose = q(root, '[data-layer="win-pose"]')
  const sparkWrap = q(root, '[data-layer="sparks"]')
  const sparkImgs = qa(root, '[data-layer="sparks"] img')
  const bloom = q(root, '[data-layer="bloom"]')

  const tl = gsap.timeline({
    onComplete,
    defaults: { force3D: true },
  })

  if (reduced) {
    gsap.set([pose, mistB, mistF], { clearProps: 'all', autoAlpha: 1 })
    tl.to(root, { autoAlpha: 1, duration: 0.25 }).to(root, { autoAlpha: 0, duration: 0.3, delay: 1.4 })
    return { kill: () => safeKill(tl) }
  }

  gsap.set(root, { autoAlpha: 1, x: 0, y: 0, scale: 1, rotation: 0 })
  gsap.set(bloom, { autoAlpha: 0, scale: 0.5 })
  gsap.set(mistB, { autoAlpha: 0, y: 40, scale: 0.85, transformOrigin: '40% 90%' })
  gsap.set(mistF, { autoAlpha: 0, y: 28, scale: 0.9, transformOrigin: '35% 100%' })
  gsap.set(pose, {
    autoAlpha: 0,
    x: 0,
    y: 56,
    scale: 0.78,
    rotation: 0,
    transformOrigin: '45% 70%',
  })
  gsap.set(sparkWrap, { autoAlpha: 1 })
  gsap.set(sparkImgs, { autoAlpha: 0 })

  // Mist + soft bloom, then one dragon rises through it
  tl.to(bloom, { autoAlpha: 0.85, scale: 1.25, duration: 0.4, ease: 'power2.out' }, 0)
    .to(mistB, { autoAlpha: 1, y: 0, scale: 1.2, duration: 0.45, ease: 'power2.out' }, 0.05)
    .to(mistF, { autoAlpha: 0.9, y: 0, scale: 1.12, duration: 0.4, ease: 'power2.out' }, 0.1)
    .to(
      pose,
      {
        autoAlpha: 1,
        y: -6,
        scale: 1.06,
        duration: 0.55,
        ease: 'power3.out',
      },
      0.22,
    )
    .to(pose, { y: 0, scale: 1, duration: 0.28, ease: 'power2.inOut' }, 0.72)

  animateSparks(tl, sparkImgs, 0.5)

  tl.to(pose, { scale: 1.04, y: -4, duration: 0.22, ease: 'power1.out' }, 1.05)
    .to(pose, { scale: 1, y: 0, duration: 0.28, ease: 'sine.inOut' }, 1.27)
    .to(mistF, { x: 10, scale: 1.2, duration: 0.5, ease: 'sine.inOut' }, 1.05)
    .to(mistB, { x: -8, scale: 1.28, duration: 0.55, ease: 'sine.inOut' }, 1.05)
    .to(pose, { y: -2, duration: 0.38, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 1.55)
    .to(
      pose,
      {
        y: 24,
        scale: 0.92,
        autoAlpha: 0,
        duration: 0.42,
        ease: 'power2.in',
      },
      2.3,
    )
    .to([mistB, mistF, bloom], { autoAlpha: 0, duration: 0.38, ease: 'power1.in' }, 2.4)
    .to(sparkImgs, { autoAlpha: 0, duration: 0.2 }, 2.35)

  return { kill: () => safeKill(tl) }
}

/**
 * Tiger win — one soft pose rising from fire/smoke over the Tiger zone. ~2.8s
 */
export function playTigerWin(
  root: HTMLElement | null,
  onComplete?: () => void,
  reduced = false,
): TimelineHandle {
  if (!root) {
    onComplete?.()
    return { kill: () => {} }
  }

  const smokeB = q(root, '[data-layer="smoke-back"]')
  const smokeF = q(root, '[data-layer="smoke-front"]')
  const pose = q(root, '[data-layer="win-pose"]')
  const sparkWrap = q(root, '[data-layer="sparks"]')
  const sparkImgs = qa(root, '[data-layer="sparks"] img')
  const bloom = q(root, '[data-layer="bloom"]')

  const tl = gsap.timeline({ onComplete, defaults: { force3D: true } })

  if (reduced) {
    gsap.set([pose, smokeB, smokeF], { clearProps: 'all', autoAlpha: 1 })
    tl.to(root, { autoAlpha: 1, duration: 0.25 }).to(root, { autoAlpha: 0, duration: 0.3, delay: 1.4 })
    return { kill: () => safeKill(tl) }
  }

  gsap.set(root, { autoAlpha: 1, x: 0, y: 0, scale: 1, rotation: 0 })
  gsap.set(bloom, { autoAlpha: 0, scale: 0.5 })
  gsap.set(smokeB, { autoAlpha: 0, y: 40, scale: 0.85, transformOrigin: '65% 90%' })
  gsap.set(smokeF, { autoAlpha: 0, y: 28, scale: 0.9, transformOrigin: '70% 100%' })
  gsap.set(pose, {
    autoAlpha: 0,
    x: 10,
    y: 52,
    scale: 0.78,
    rotation: 0,
    transformOrigin: '60% 70%',
  })
  gsap.set(sparkWrap, { autoAlpha: 1 })
  gsap.set(sparkImgs, { autoAlpha: 0 })

  tl.to(bloom, { autoAlpha: 0.9, scale: 1.3, duration: 0.38, ease: 'power2.out' }, 0)
    .to(smokeB, { autoAlpha: 1, y: 0, scale: 1.22, duration: 0.45, ease: 'power2.out' }, 0.04)
    .to(smokeF, { autoAlpha: 0.9, y: 0, scale: 1.14, duration: 0.4, ease: 'power2.out' }, 0.1)
    .to(
      pose,
      {
        autoAlpha: 1,
        x: 0,
        y: -10,
        scale: 1.08,
        duration: 0.48,
        ease: 'power3.out',
      },
      0.2,
    )
    .to(pose, { y: 0, scale: 1, duration: 0.26, ease: 'power2.inOut' }, 0.66)

  animateSparks(tl, sparkImgs, 0.48)

  tl.to(pose, { scale: 1.05, y: -4, duration: 0.2, ease: 'power1.out' }, 1.05)
    .to(pose, { scale: 1, y: 0, duration: 0.28, ease: 'sine.inOut' }, 1.25)
    .to(smokeF, { x: -10, scale: 1.22, duration: 0.5, ease: 'sine.inOut' }, 1.05)
    .to(smokeB, { x: 8, scale: 1.3, duration: 0.55, ease: 'sine.inOut' }, 1.05)
    .to(pose, { y: -2, duration: 0.36, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 1.55)
    .to(
      pose,
      {
        x: 12,
        y: 28,
        scale: 0.9,
        autoAlpha: 0,
        duration: 0.42,
        ease: 'power2.in',
      },
      2.3,
    )
    .to([smokeB, smokeF, bloom], { autoAlpha: 0, duration: 0.38, ease: 'power1.in' }, 2.4)
    .to(sparkImgs, { autoAlpha: 0, duration: 0.2 }, 2.35)

  return { kill: () => safeKill(tl) }
}

export function playTieWin(
  root: HTMLElement | null,
  onComplete?: () => void,
  reduced = false,
): TimelineHandle {
  if (!root) {
    onComplete?.()
    return { kill: () => {} }
  }
  const blue = q(root, '[data-energy="blue"]')
  const orange = q(root, '[data-energy="orange"]')
  const wave = q(root, '[data-energy="wave"]')
  const ornament = q(root, '[data-energy="ornament"]')

  const tl = gsap.timeline({ onComplete })
  if (reduced) {
    tl.to(root, { autoAlpha: 1, duration: 0.3 }).to(root, { autoAlpha: 0, duration: 0.3, delay: 0.6 })
    return { kill: () => safeKill(tl) }
  }

  gsap.set(root, { autoAlpha: 1 })
  gsap.set(blue, { x: -100, autoAlpha: 0.15, scale: 0.8 })
  gsap.set(orange, { x: 100, autoAlpha: 0.15, scale: 0.8 })
  gsap.set(wave, { scale: 0.15, autoAlpha: 0 })
  gsap.set(ornament, { rotation: 0, scale: 0.85, autoAlpha: 0.6 })

  tl.to(blue, { x: -10, autoAlpha: 1, scale: 1.1, duration: 0.55, ease: 'power2.out' }, 0)
    .to(orange, { x: 10, autoAlpha: 1, scale: 1.1, duration: 0.55, ease: 'power2.out' }, 0)
    .to(ornament, { autoAlpha: 1, scale: 1, duration: 0.4 }, 0.25)
    .to(wave, { scale: 2.6, autoAlpha: 1, duration: 0.7, ease: 'power2.out' }, 0.4)
    .to(ornament, { rotation: 22, duration: 0.55, ease: 'sine.inOut' }, 0.45)
    .to([blue, orange], { x: 0, scale: 1, duration: 0.4 }, 0.7)
    .to(wave, { autoAlpha: 0, duration: 0.45 }, 1.05)
    .to(root, { autoAlpha: 0, duration: 0.4 }, 1.45)

  return { kill: () => safeKill(tl) }
}

export function playCardDeal(el: HTMLElement | null, fromSide: 'left' | 'right', reduced = false) {
  if (!el) return { kill: () => {} }
  if (reduced) {
    gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 })
    return { kill: () => gsap.killTweensOf(el) }
  }
  const x = fromSide === 'left' ? -60 : 60
  const tw = gsap.fromTo(
    el,
    { x, y: -40, rotation: fromSide === 'left' ? -18 : 18, scale: 0.7, autoAlpha: 0 },
    { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: 'back.out(1.4)' },
  )
  return { kill: () => safeKill(tw) }
}

export function resetResultScene(root: HTMLElement | null) {
  if (!root) return
  gsap.killTweensOf(root.querySelectorAll('*'))
  gsap.set(root, { clearProps: 'all' })
}

export function useGsapCleanup(handles: RefObject<TimelineHandle[]>) {
  return () => {
    for (const h of handles.current) h.kill()
    handles.current = []
  }
}
