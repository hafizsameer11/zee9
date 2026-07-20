import { useEffect, useState, type CSSProperties, type RefObject } from 'react'

/**
 * Design canvas system — games are laid out on a fixed-width design canvas
 * that is scaled to fill the viewport edge-to-edge (width-fit, dynamic height).
 *
 * Default design width matches the 896×414 mobile frame, so games render at
 * ~0.83–1.05 scale on real phones and text stays readable. Legacy games that
 * were px-tuned on the old 1920-wide canvas pass LEGACY_DESIGN_W explicitly.
 */
export const FRAME_W = 896
export const FRAME_H = 414
export const DESIGN_W = FRAME_W
export const DESIGN_H = FRAME_H
export const LEGACY_DESIGN_W = 1920
export const LEGACY_DESIGN_H = Math.round(LEGACY_DESIGN_W * (FRAME_H / FRAME_W))

export type DesignLayout = {
  scale: number
  insetX: number
  insetY: number
  /** Actual canvas size — height is dynamic so the game fills any aspect ratio */
  designW: number
  designH: number
}

const DEFAULT_LAYOUT: DesignLayout = {
  scale: 1,
  insetX: 0,
  insetY: 0,
  designW: DESIGN_W,
  designH: DESIGN_H,
}

export function getDesignScaleShellStyle(layout: DesignLayout): CSSProperties {
  return {
    position: 'absolute',
    left: layout.insetX,
    top: layout.insetY,
    width: layout.designW * layout.scale,
    height: layout.designH * layout.scale,
    overflow: 'hidden',
  }
}

export function getDesignCanvasStyle(layout: DesignLayout): CSSProperties {
  return {
    width: layout.designW,
    height: layout.designH,
    transform: `scale(${layout.scale})`,
    transformOrigin: 'top left',
    boxSizing: 'border-box',
  }
}

export function useDesignScale(
  containerRef: RefObject<HTMLDivElement | null>,
  designW = DESIGN_W,
  baseDesignH = DESIGN_H,
): DesignLayout {
  const [layout, setLayout] = useState<DesignLayout>({
    ...DEFAULT_LAYOUT,
    designW,
    designH: baseDesignH,
  })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const update = () => {
      // Use layout size — getBoundingClientRect() is wrong inside the
      // portrait→landscape CSS rotate wrapper (width/height swap in screen space).
      const cw = el.clientWidth
      const ch = el.clientHeight
      if (cw <= 0 || ch <= 0) return

      // Contain-fit: entire design canvas stays inside the viewport (896×414 frame).
      const scale = Math.min(cw / designW, ch / baseDesignH)
      const scaledW = designW * scale
      const scaledH = baseDesignH * scale

      setLayout({
        scale,
        insetX: (cw - scaledW) / 2,
        insetY: (ch - scaledH) / 2,
        designW,
        designH: baseDesignH,
      })
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    const onOrientation = () => requestAnimationFrame(update)
    window.addEventListener('orientationchange', onOrientation)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', onOrientation)
      window.removeEventListener('resize', update)
    }
  }, [containerRef, designW, baseDesignH])

  return layout
}
