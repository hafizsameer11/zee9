import gsap from 'gsap'

export type TimelineHandle = { kill: () => void }

function safeKill(tl: gsap.core.Animation | null) {
  if (tl) tl.kill()
}

/** Short UI pulse when a lane step succeeds. */
export function playStepSuccessUi(
  root: HTMLElement | null,
  reduced = false,
): TimelineHandle {
  if (!root || reduced) return { kill: () => {} }
  const payout = root.querySelector('[data-ui="payout"]') as HTMLElement | null
  const mult = root.querySelector('[data-ui="mult"]') as HTMLElement | null
  const targets = [payout, mult].filter(Boolean) as HTMLElement[]
  const tl = gsap.timeline()
  if (mult) {
    gsap.set(mult, { scale: 1 })
    tl.to(mult, { scale: 1.12, duration: 0.16, ease: 'power2.out' }).to(mult, {
      scale: 1,
      duration: 0.22,
      ease: 'power2.inOut',
    })
  }
  if (payout) {
    tl.fromTo(
      payout,
      { y: 6, opacity: 0.55 },
      { y: 0, opacity: 1, duration: 0.28, ease: 'power2.out' },
      0,
    )
  }
  return {
    kill: () => {
      safeKill(tl)
      gsap.killTweensOf(targets)
    },
  }
}

/** Full-screen win overlay entrance. */
export function playWinOverlay(
  root: HTMLElement | null,
  reduced = false,
): TimelineHandle {
  if (!root || reduced) {
    if (root) gsap.set(root, { autoAlpha: 1 })
    return { kill: () => {} }
  }
  const badge = root.querySelector('[data-ui="badge"]') as HTMLElement | null
  const amount = root.querySelector('[data-ui="amount"]') as HTMLElement | null
  const rays = root.querySelector('[data-ui="rays"]') as HTMLElement | null
  const tl = gsap.timeline()
  gsap.set(root, { autoAlpha: 1 })
  if (rays) {
    gsap.set(rays, { rotation: 0, scale: 0.7, opacity: 0.2 })
    tl.to(rays, { opacity: 0.75, scale: 1.05, duration: 0.45, ease: 'power2.out' }, 0)
    tl.to(rays, { rotation: 18, duration: 2.4, ease: 'none' }, 0)
  }
  if (badge) {
    gsap.set(badge, { scale: 0.4, opacity: 0 })
    tl.to(badge, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.6)' }, 0.05)
  }
  if (amount) {
    gsap.set(amount, { y: 16, opacity: 0 })
    tl.to(amount, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }, 0.18)
  }
  return {
    kill: () => {
      safeKill(tl)
      gsap.killTweensOf([badge, amount, rays].filter(Boolean))
    },
  }
}

/** Loss overlay entrance. */
export function playLossOverlay(
  root: HTMLElement | null,
  reduced = false,
): TimelineHandle {
  if (!root || reduced) {
    if (root) gsap.set(root, { autoAlpha: 1 })
    return { kill: () => {} }
  }
  const badge = root.querySelector('[data-ui="badge"]') as HTMLElement | null
  const flash = root.querySelector('[data-ui="flash"]') as HTMLElement | null
  const tl = gsap.timeline()
  gsap.set(root, { autoAlpha: 1 })
  if (flash) {
    gsap.set(flash, { opacity: 0 })
    tl.to(flash, { opacity: 0.55, duration: 0.08 }).to(flash, {
      opacity: 0,
      duration: 0.35,
    })
  }
  if (badge) {
    gsap.set(badge, { scale: 1.25, opacity: 0, y: -8 })
    tl.to(badge, { scale: 1, opacity: 1, y: 0, duration: 0.38, ease: 'power2.out' }, 0.05)
  }
  return {
    kill: () => {
      safeKill(tl)
      gsap.killTweensOf([badge, flash].filter(Boolean))
    },
  }
}
