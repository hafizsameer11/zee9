/** Illustrated 3D dice for 7 UP DOWN */

const DOTS: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
}

const DICE_SHADOW =
  '0 10px 30px rgba(245,127,23,0.5), inset 0 2px 8px rgba(255,255,255,0.6), inset 0 -6px 12px rgba(0,0,0,0.25)'

export function IllustratedDice({
  value,
  rolling,
  tilt = 'left',
}: {
  value: number | '?'
  rolling?: boolean
  tilt?: 'left' | 'right'
}) {
  const rotate = tilt === 'left' ? '-rotate-6' : 'rotate-6'
  if (value === '?' || rolling) {
    return (
      <div
        className={`size-24 bg-gradient-to-br from-[#ffeb3b] via-[#fbc02d] to-[#f57f17] grid grid-cols-3 grid-rows-3 rounded-2xl p-4 gap-1 ${rotate} ${
          rolling ? 'animate-pulse' : ''
        }`}
        style={{ boxShadow: DICE_SHADOW }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} />
        ))}
      </div>
    )
  }
  const d = DOTS[value] ?? []
  return (
    <div
      className={`size-24 bg-gradient-to-br from-[#ffeb3b] via-[#fbc02d] to-[#f57f17] grid grid-cols-3 grid-rows-3 rounded-2xl p-4 gap-1 ${rotate}`}
      style={{ boxShadow: DICE_SHADOW }}
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const row = Math.floor(i / 3)
        const col = i % 3
        const on = d.some(([r, c]) => r === row && c === col)
        return (
          <span key={i} className="flex items-center justify-center">
            {on && <span className="size-3 shadow-inner rounded-full bg-[#0a0603]" />}
          </span>
        )
      })}
    </div>
  )
}

export function sumHistoryClass(sum: number): string {
  if (sum === 7) return 'bg-[#ffeb3b]/25 text-[#ffeb3b]'
  if (sum < 7) return 'bg-[#f57f17]/20 text-[#f57f17]'
  return 'bg-[#fbc02d]/20 text-[#fbc02d]'
}

export function choiceLabel(c: 'up' | 'down' | 'seven'): string {
  if (c === 'up') return '7 UP'
  if (c === 'down') return '7 DOWN'
  return 'LUCKY 7'
}

export function potentialMultiplier(c: 'up' | 'down' | 'seven'): number {
  return c === 'seven' ? 5 : 2
}
