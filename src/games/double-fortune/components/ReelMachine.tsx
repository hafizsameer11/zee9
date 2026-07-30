import { memo, useEffect, useMemo, useRef } from 'react'
import {
  COL_GAP,
  COLS,
  FRAME_INSET,
  MACHINE_H,
  MACHINE_W,
  ROW_GAP,
  SYMBOL_H,
  SYMBOL_W,
  VISIBLE_ROWS,
  FS_SYMBOL_H,
} from '../constants/layoutConfig'
import { ASSET } from '../constants/gameConfig'
import { SYMBOL_MAP, type SymbolId } from '../constants/symbolConfig'
import { buildReelStrip, type Cell } from '../engines/doubleFortuneEngine'
import styles from '../styles/doubleFortune.module.css'

type Props = {
  grid: Cell[][]
  spinning: boolean
  stoppingReels: boolean[]
  winningCells: Set<string>
  turbo: boolean
  compact?: boolean
  boardKey?: string
}

function SymbolView({
  id,
  win,
  compact,
}: {
  id: SymbolId
  win: boolean
  compact?: boolean
}) {
  const meta = SYMBOL_MAP[id]
  const h = compact ? FS_SYMBOL_H : SYMBOL_H
  const fill = 0.98
  return (
    <div
      className={`${styles.symbolCell} ${win ? styles.symbolWin : ''} ${id === 'wild' ? styles.symbolWild : ''} ${id === 'scatter' ? styles.symbolScatter : ''} ${id === 'happiness' ? styles.symbolHappiness : ''}`}
      style={{ width: SYMBOL_W, height: h }}
    >
      <img
        className={styles.symbolImg}
        src={meta.src}
        alt={meta.label}
        draggable={false}
        style={{ width: `${fill * 100}%`, height: `${fill * 100}%` }}
      />
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
  compact,
  boardKey,
}: {
  col: number
  cells: Cell[]
  spinning: boolean
  stopping: boolean
  winningCells: Set<string>
  turbo: boolean
  compact?: boolean
  boardKey?: string
}) {
  const stripRef = useRef<HTMLDivElement>(null)
  const symH = compact ? FS_SYMBOL_H : SYMBOL_H
  const stripIds = useMemo(() => buildReelStrip(turbo ? 20 : 28), [spinning, turbo])
  const showStrip = spinning && !stopping
  const viewportH = VISIBLE_ROWS * symH + (VISIBLE_ROWS - 1) * ROW_GAP

  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    if (!spinning && !stopping) {
      el.style.transition = 'none'
      el.style.transform = 'translate3d(0,0,0)'
      return
    }
    if (spinning && !stopping) {
      const dist = (symH + ROW_GAP) * (turbo ? 16 : 24)
      el.style.transition = 'none'
      el.style.transform = 'translate3d(0,0,0)'
      void el.offsetHeight
      el.style.transition = `transform ${turbo ? 0.42 : 1.4}s cubic-bezier(0.12, 0.78, 0.2, 1)`
      el.style.transform = `translate3d(0,${-dist}px,0)`
    }
    if (stopping) {
      el.style.transition = 'transform 0.32s cubic-bezier(0.16, 1.55, 0.3, 1)'
      el.style.transform = 'translate3d(0,0,0)'
    }
  }, [spinning, stopping, turbo, symH])

  return (
    <div className={styles.reelCol} style={{ width: SYMBOL_W, height: viewportH }}>
      <div
        ref={stripRef}
        className={`${styles.reelStrip} ${showStrip ? styles.reelStripBlur : ''}`}
        style={{ gap: ROW_GAP }}
      >
        {showStrip
          ? stripIds.map((id, i) => (
              <SymbolView key={`s-${boardKey}-${col}-${i}`} id={id} win={false} compact={compact} />
            ))
          : cells.slice(0, VISIBLE_ROWS).map((cell, row) => (
              <SymbolView
                key={`g-${boardKey}-${col}-${row}-${cell.id}`}
                id={cell.id}
                win={winningCells.has(`${col}:${row}`)}
                compact={compact}
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
  compact,
  boardKey = 'a',
}: Props) {
  const symH = compact ? FS_SYMBOL_H : SYMBOL_H
  const viewportH = VISIBLE_ROWS * symH + (VISIBLE_ROWS - 1) * ROW_GAP
  const machineH = compact ? viewportH + FRAME_INSET * 2 : MACHINE_H

  return (
    <div
      className={`${styles.machine} ${compact ? styles.machineCompact : ''}`}
      style={{ width: MACHINE_W, height: machineH }}
      aria-label="Reel machine"
    >
      <img className={styles.machinePlate} src={ASSET.reelPlate} alt="" draggable={false} />
      <div
        className={styles.reelViewport}
        style={{
          width: COLS * SYMBOL_W + (COLS - 1) * COL_GAP,
          height: viewportH,
          top: FRAME_INSET,
          left: FRAME_INSET,
        }}
      >
        {Array.from({ length: COLS }, (_, col) => (
          <ReelColumn
            key={`${boardKey}-${col}`}
            col={col}
            cells={grid[col]!}
            spinning={spinning}
            stopping={stoppingReels[col]!}
            winningCells={winningCells}
            turbo={turbo}
            compact={compact}
            boardKey={boardKey}
          />
        ))}
      </div>
      <img className={styles.machineFrame} src={ASSET.reelFrame} alt="" draggable={false} />
    </div>
  )
})
