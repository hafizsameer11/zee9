import type { OxSymbol } from '../engines/fortuneOx'
import { OX_SYMBOL_META } from '../engines/fortuneOx'

const CELL_SHADOW =
  'inset 0 2px 6px rgba(255,255,255,0.08), inset 0 -6px 10px rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.4)'

const GOLD_SHADOW =
  '0 0 28px rgba(212,175,55,0.7), inset 0 3px 8px rgba(255,255,255,0.5), inset 0 -8px 12px rgba(120,80,10,0.6)'

function cellBg(sym: OxSymbol, win: boolean): string {
  if (win && sym === 'ox') {
    return 'radial-gradient(circle at 35% 28%, #ffe9a8, #d4af37, #a67c1a)'
  }
  if (sym === 'ox') {
    return 'radial-gradient(circle at 35% 30%, oklch(0.32 0.06 25), oklch(0.2 0.04 25))'
  }
  if (sym === 'coin' || sym === 'ingot' || sym === 'trophy') {
    return 'radial-gradient(circle at 35% 30%, oklch(0.34 0.06 55), oklch(0.2 0.04 45))'
  }
  if (sym === 'envelope') {
    return 'radial-gradient(circle at 35% 30%, oklch(0.34 0.08 25), oklch(0.2 0.05 25))'
  }
  return 'radial-gradient(circle at 35% 30%, oklch(0.3 0.04 25), oklch(0.2 0.03 25))'
}

export function OxSymbolCell({
  symbol,
  win,
  spinning,
}: {
  symbol: OxSymbol
  win?: boolean
  spinning?: boolean
}) {
  const meta = OX_SYMBOL_META[symbol]
  const isLetter = symbol.length === 1 && symbol >= 'A' && symbol <= 'Z'

  return (
    <div
      className={`aspect-square rounded-xl flex justify-center items-center leading-none text-5xl font-black transition-transform ${
        spinning ? 'opacity-70 blur-[1px] scale-95' : ''
      } ${win ? 'ring-2 ring-[#fff3c8]' : ''}`}
      style={{
        background: cellBg(symbol, !!win),
        boxShadow: win && meta.gold ? GOLD_SHADOW : CELL_SHADOW,
      }}
    >
      <span className={`drop-shadow-[0_3px_5px_rgba(0,0,0,0.6)] ${isLetter ? 'text-neutral-50' : ''}`}>
        {meta.emoji}
      </span>
    </div>
  )
}

export function OxMascot({ className = '' }: { className?: string }) {
  return (
    <div className={`drop-shadow-[0_6px_16px_rgba(0,0,0,0.6)] rotate-6 opacity-90 text-7xl absolute right-8 -top-4 pointer-events-none ${className}`}>
      <span
        className="inline-block"
        style={{
          filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.5))',
        }}
      >
        🐂
      </span>
    </div>
  )
}
