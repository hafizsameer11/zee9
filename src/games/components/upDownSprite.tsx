import type { CSSProperties, ReactNode } from 'react'
import type { AtlasSpriteDef } from './upDownAssets'
import { ATLAS_SIZE } from './upDownAssets'

function spriteDims(def: AtlasSpriteDef, scale: number) {
  const [, , sw, sh] = def.rect
  return {
    w: (def.rotated ? sh : sw) * scale,
    h: (def.rotated ? sw : sh) * scale,
    sw: sw * scale,
    sh: sh * scale,
  }
}

function atlasBgStyle(def: AtlasSpriteDef, scale: number): CSSProperties {
  const [sx, sy] = def.rect
  const { sw, sh } = spriteDims(def, scale)
  const sheet = ATLAS_SIZE[def.atlas] ?? { w: 2048, h: 2048 }
  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: sw,
    height: sh,
    backgroundImage: `url(${def.atlas})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${sheet.w * scale}px ${sheet.h * scale}px`,
    backgroundPosition: `-${sx * scale}px -${sy * scale}px`,
    transform: def.rotated
      ? 'translate(-50%, -50%) rotate(-90deg)'
      : 'translate(-50%, -50%)',
  }
}

export function AtlasSprite({
  def,
  className = '',
  style,
  scale = 1,
  alt = '',
}: {
  def: AtlasSpriteDef
  className?: string
  style?: CSSProperties
  scale?: number
  alt?: string
}) {
  const { w, h } = spriteDims(def, scale)

  return (
    <span
      className={className}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      style={{
        display: 'inline-block',
        width: w,
        height: h,
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        ...style,
      }}
    >
      <span aria-hidden style={atlasBgStyle(def, scale)} />
    </span>
  )
}

export function AtlasButton({
  def,
  className = '',
  style,
  scale = 1,
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  def: AtlasSpriteDef
  className?: string
  style?: CSSProperties
  scale?: number
  onClick?: () => void
  disabled?: boolean
  ariaLabel?: string
  children?: ReactNode
}) {
  const { w, h } = spriteDims(def, scale)

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        border: 'none',
        padding: 0,
        margin: 0,
        cursor: disabled ? 'default' : 'pointer',
        width: w,
        height: h,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'transparent',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
        ...style,
      }}
    >
      <span aria-hidden style={{ ...atlasBgStyle(def, scale), pointerEvents: 'none' }} />
      {children}
    </button>
  )
}

export function SceneImage({
  src,
  className = '',
  style,
  alt = '',
}: {
  src: string
  className?: string
  style?: CSSProperties
  alt?: string
}) {
  return <img src={src} className={className} style={style} alt={alt} draggable={false} />
}
