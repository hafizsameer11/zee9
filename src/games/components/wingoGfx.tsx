import { numberToColor, type WingoColor } from '../engines/wingo'
import type { CSSProperties } from 'react'

export const BALL_GRADIENT: Record<WingoColor, string> = {
  green:
    'radial-gradient(circle at 32% 26%, #a5e3ab, #5cc264 42%, #2e7d32 75%, #1f5c24)',
  red: 'radial-gradient(circle at 32% 26%, #ff9b98, #ff5c58 42%, #c41e3a 75%, #961528)',
  violet:
    'radial-gradient(circle at 32% 26%, #e3aef0, #c765e0 42%, #9c27b0 75%, #7a1e8c)',
}

export const BALL_SHADOW =
  'inset 0 -6px 12px rgba(0,0,0,0.45), inset 0 2px 4px rgba(255,255,255,0.5), 0 0 0 1px rgba(255,255,255,0.12), 0 4px 10px rgba(0,0,0,0.4)'

export const BALL_SHADOW_SM =
  'inset 0 -3px 5px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.5)'

export function ballColorForNumber(n: number): WingoColor {
  return numberToColor(n)
}

const SPLIT_GRADIENT: Record<string, string> = {
  '0': 'linear-gradient(135deg, #ef4444 50%, #a855f7 50%)',
  '5': 'linear-gradient(135deg, #22c55e 50%, #a855f7 50%)',
}

export function isSplitNumber(n: number) {
  return n === 0 || n === 5
}

type BallSize = 'hero' | 'grid' | 'history' | 'mini' | 'dot' | 'compact' | 'bet'

const SIZE: Record<BallSize, { w: number; text: string; blur: string }> = {
  hero: { w: 176, text: 'text-7xl', blur: 'size-14 left-8 top-6' },
  grid: { w: 64, text: 'text-2xl', blur: 'size-6 left-3 top-2' },
  bet: { w: 34, text: 'text-sm', blur: 'size-3 left-1 top-0.5' },
  history: { w: 32, text: 'text-xs', blur: 'size-3 left-1 top-0.5' },
  compact: { w: 22, text: 'text-[10px]', blur: 'size-2 left-0.5 top-0' },
  mini: { w: 24, text: 'text-[10px]', blur: 'size-2 left-1 top-0.5' },
  dot: { w: 20, text: 'text-[0px]', blur: 'size-2 left-1 top-0.5' },
}

export function WingoBall({
  number,
  color,
  size = 'grid',
  selected,
  onClick,
  className = '',
  style,
}: {
  number?: number
  color: WingoColor
  size?: BallSize
  selected?: boolean
  onClick?: () => void
  className?: string
  style?: CSSProperties
}) {
  const s = SIZE[size]
  const px = s.w
  const Tag = onClick ? 'button' : 'span'
  const splitBg = number != null && isSplitNumber(number) ? SPLIT_GRADIENT[String(number)] : undefined
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative rounded-full flex justify-center items-center overflow-hidden leading-none font-black text-white ${s.text} ${
        selected ? 'ring-2 ring-white ring-offset-1 ring-offset-[#d4f5e9]' : ''
      } ${onClick ? 'cursor-pointer transition-transform hover:scale-105' : ''} ${className}`}
      style={{
        width: px,
        height: px,
        background: splitBg ?? BALL_GRADIENT[color],
        boxShadow:
          size === 'history' || size === 'compact' || size === 'mini' || size === 'dot'
            ? BALL_SHADOW_SM
            : BALL_SHADOW,
        ...style,
      }}
    >
      <span
        className={`blur-md rounded-full bg-white/50 absolute pointer-events-none ${s.blur}`}
        aria-hidden
      />
      {number != null && size !== 'dot' && (
        <span className="relative drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">{number}</span>
      )}
    </Tag>
  )
}

export function WingoBallIdle({ size = 'hero' }: { size?: 'hero' | 'grid' }) {
  const px = size === 'hero' ? 224 : 64
  return (
    <span
      className="relative rounded-full flex justify-center items-center overflow-hidden font-black text-white/40"
      style={{
        width: px,
        height: px,
        background: 'radial-gradient(circle at 32% 26%, #4a4a4a, #2a2a2a 70%, #1a1a1a)',
        boxShadow: BALL_SHADOW,
        fontSize: size === 'hero' ? '4.5rem' : '1.5rem',
      }}
    >
      ?
    </span>
  )
}

/** Illustrated color swatch (sidebar / bet chips) */
export function ColorDot({ color, className = '' }: { color: WingoColor; className?: string }) {
  return (
    <span
      className={`rounded-full shrink-0 ${className}`}
      style={{
        width: 20,
        height: 20,
        background: BALL_GRADIENT[color],
        boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.6)',
      }}
    />
  )
}
