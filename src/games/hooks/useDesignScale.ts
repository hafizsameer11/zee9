import { useEffect, useState, type CSSProperties, type RefObject } from 'react'

/** Match 896×414 mobile frame so games fill edge-to-edge. */
export const FRAME_W = 896
export const FRAME_H = 414
export const DESIGN_W = 1920
export const DESIGN_H = Math.round(DESIGN_W * (FRAME_H / FRAME_W))

export type DesignLayout = {
  scale: number
  insetX: number
  insetY: number
}

const DEFAULT_LAYOUT: DesignLayout = { scale: 0.45, insetX: 0, insetY: 0 }

export function getDesignCanvasStyle(
  layout: DesignLayout,
  designW = DESIGN_W,
  designH = DESIGN_H,
): CSSProperties {
  return {
    width: designW,
    height: designH,
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate(${layout.insetX}px, ${layout.insetY}px) scale(${layout.scale})`,
    transformOrigin: 'top left',
  }
}

export function useDesignScale(
  containerRef: RefObject<HTMLDivElement | null>,
  designW = DESIGN_W,
  designH = DESIGN_H,
): DesignLayout {
  const [layout, setLayout] = useState<DesignLayout>(DEFAULT_LAYOUT)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      const cw = rect.width
      const ch = rect.height
      if (cw <= 0 || ch <= 0) return

      const scale = Math.min(cw / designW, ch / designH)
      const s = scale > 0 ? scale : 0.45
      const scaledW = designW * s
      const scaledH = designH * s

      setLayout({
        scale: s,
        insetX: Math.max(0, (cw - scaledW) / 2),
        insetY: Math.max(0, (ch - scaledH) / 2),
      })
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('orientationchange', update)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', update)
      window.removeEventListener('resize', update)
    }
  }, [containerRef, designW, designH])

  return layout
}
