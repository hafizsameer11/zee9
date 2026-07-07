import type { CSSProperties } from 'react'
import type { GemsSymbol } from '../engines/fortuneGems'
import { spriteForSymbol, spriteStyle } from './fortuneGemsAssets'

export function GemsSymbolView({
  symbol,
  size = 72,
  className,
  style,
  pulse,
}: {
  symbol: GemsSymbol
  size?: number
  className?: string
  style?: CSSProperties
  pulse?: boolean
}) {
  const sprite = spriteForSymbol(symbol)
  return (
    <div
      className={className}
      style={{ ...spriteStyle(sprite, size), ...style }}
      aria-hidden
      data-pulse={pulse ? '1' : undefined}
    />
  )
}

export function GemsWildBadge({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      WILD
    </span>
  )
}
