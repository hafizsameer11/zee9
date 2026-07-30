import { memo, useEffect, useMemo, useRef } from 'react'
import {
  COL_GAP,
  COLS,
  FRAME_INSET,
  MACHINE_H,
  MACHINE_W,
  REEL_VIEWPORT_H,
  ROW_GAP,
  SYMBOL_H,
  SYMBOL_W,
  VISIBLE_ROWS,
  isDebugTransparency,
} from '../constants/layoutConfig'
import { ASSET } from '../constants/gameConfig'
import { SYMBOL_MAP, type SymbolId } from '../constants/symbolConfig'
import { buildReelStrip, type Cell } from '../engines/bountyTrailEngine'
import styles from '../styles/stage.module.css'

type Props = {
  grid: Cell[][]
  spinning: boolean
  stoppingReels: boolean[]
  winningCells: Set<string>
  turbo: boolean
}

function SymbolView({
  id,
  gold,
  goldMult,
  win,
}: {
  id: SymbolId
  gold: boolean
  goldMult: number
  win: boolean
}) {
  const meta = SYMBOL_MAP[id]
  const fill = meta.kind === 'character' || meta.kind === 'special' ? 0.98 : 0.92
  return (
    <div
      className={`${styles.symbolCell} ${win ? styles.symbolWin : ''} ${
        isDebugTransparency() ? styles.checker : ''
      }`}
      style={{ width: SYMBOL_W, height: SYMBOL_H }}
    >
      <img
        className={styles.symbolImg}
        src={meta.src}
        alt={meta.label}
        draggable={false}
        style={{ width: `${fill * 100}%`, height: `${fill * 100}%` }}
      />
      {gold && (
        <img className={styles.goldFrame} src={ASSET.goldFrame} alt="" draggable={false} />
      )}
      {gold && goldMult > 1 && <span className={styles.goldBadge}>x{goldMult}</span>}
    </div>
  )
}

const ReelColumn = memo(function ReelColumn({
  col,
  cells,
  spinning,
  stopping,
  winningCells,
  turbo,
}: {
  col: number
  cells: Cell[]
  spinning: boolean
  stopping: boolean
  winningCells: Set<string>
  turbo: boolean
}) {
  const stripRef = useRef<HTMLDivElement>(null)
  const stripIds = useMemo(() => buildReelStrip(turbo ? 22 : 32), [spinning, turbo])
  const showStrip = spinning && !stopping

  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    if (!spinning && !stopping) {
      el.style.transition = 'none'
      el.style.transform = 'translate3d(0,0,0)'
      return
    }
    if (spinning && !stopping) {
      const dist = (SYMBOL_H + ROW_GAP) * (turbo ? 18 : 26)
      el.style.transition = 'none'
      el.style.transform = 'translate3d(0,0,0)'
      void el.offsetHeight
      el.style.transition = `transform ${turbo ? 0.48 : 1.5}s cubic-bezier(0.12, 0.78, 0.2, 1)`
      el.style.transform = `translate3d(0,${-dist}px,0)`
    }
    if (stopping) {
      el.style.transition = 'transform 0.34s cubic-bezier(0.16, 1.55, 0.3, 1)'
      el.style.transform = 'translate3d(0,0,0)'
    }
  }, [spinning, stopping, turbo])

  return (
    <div className={styles.reelCol} style={{ width: SYMBOL_W, height: REEL_VIEWPORT_H }}>
      <div
        ref={stripRef}
        className={`${styles.reelStrip} ${showStrip ? styles.reelStripBlur : ''}`}
        style={{ gap: ROW_GAP }}
      >
        {showStrip
          ? stripIds.map((id, i) => (
              <SymbolView key={`s-${col}-${i}`} id={id} gold={false} goldMult={1} win={false} />
            ))
          : cells.slice(0, VISIBLE_ROWS).map((cell, row) => (
              <SymbolView
                key={`g-${col}-${row}-${cell.id}`}
                id={cell.id}
                gold={cell.gold}
                goldMult={cell.goldMult}
                win={winningCells.has(`${col}:${row}`)}
              />
            ))}
      </div>
    </div>
  )
})

export default memo(function ReelMachine({
  grid,
  spinning,
  stoppingReels,
  winningCells,
  turbo,
}: Props) {
  return (
    <div
      className={styles.machine}
      style={{ width: MACHINE_W, height: MACHINE_H }}
      aria-label="Reel machine"
    >
      <div className={styles.machineWood} aria-hidden />
      <img className={styles.machineFrame} src={ASSET.reelFrame} alt="" draggable={false} />
      <div
        className={styles.reelViewport}
        style={{
          width: COLS * SYMBOL_W + (COLS - 1) * COL_GAP,
          height: REEL_VIEWPORT_H,
          top: FRAME_INSET,
          left: FRAME_INSET,
          gap: COL_GAP,
        }}
      >
        {Array.from({ length: COLS }, (_, col) => (
          <ReelColumn
            key={col}
            col={col}
            cells={grid[col] ?? []}
            spinning={spinning}
            stopping={stoppingReels[col] === true}
            winningCells={winningCells}
            turbo={turbo}
          />
        ))}
      </div>
      <div className={styles.machineVignette} aria-hidden />
    </div>
  )
})
