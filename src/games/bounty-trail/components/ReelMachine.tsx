import { memo, useEffect, useMemo, useRef } from 'react'
import {
  COL_GAP,
  COLS,
  REEL_H,
  REEL_W,
  REEL_X,
  REEL_Y,
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
  goldActivating?: Set<string>
  turbo: boolean
}

function SymbolView({
  id,
  gold,
  goldMult,
  win,
  goldActivating,
  stagger,
}: {
  id: SymbolId
  gold: boolean
  goldMult: number
  win: boolean
  goldActivating: boolean
  stagger: number
}) {
  const meta = SYMBOL_MAP[id]
  const fill = meta.kind === 'character' || meta.kind === 'special' ? 0.96 : 0.9
  return (
    <div
      className={`${styles.symbolCell} ${win ? styles.symbolWin : ''} ${
        goldActivating ? styles.goldActivate : ''
      } ${isDebugTransparency() ? styles.checker : ''}`}
      style={{
        width: SYMBOL_W,
        height: SYMBOL_H,
        animationDelay: win ? `${stagger * 0.07}s` : undefined,
      }}
    >
      <img
        className={styles.symbolImg}
        src={meta.src}
        alt={meta.label}
        draggable={false}
        style={{ width: `${fill * 100}%`, height: `${fill * 100}%` }}
      />
      {gold && <img className={styles.goldFrame} src={ASSET.goldFrame} alt="" draggable={false} />}
      {gold && goldMult > 1 && <span className={styles.goldBadge}>x{goldMult}</span>}
      {win && <span className={styles.winRing} aria-hidden />}
    </div>
  )
}

const ReelColumn = memo(function ReelColumn({
  col,
  cells,
  spinning,
  stopping,
  winningCells,
  goldActivating,
  turbo,
}: {
  col: number
  cells: Cell[]
  spinning: boolean
  stopping: boolean
  winningCells: Set<string>
  goldActivating: Set<string>
  turbo: boolean
}) {
  const colRef = useRef<HTMLDivElement>(null)
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
      el.style.transition = 'transform 0.38s cubic-bezier(0.16, 1.55, 0.3, 1)'
      el.style.transform = 'translate3d(0,0,0)'
    }
  }, [spinning, stopping, turbo])

  useEffect(() => {
    const colEl = colRef.current
    if (!colEl || !stopping) return
    colEl.classList.remove(styles.reelBounce)
    void colEl.offsetWidth
    colEl.classList.add(styles.reelBounce)
    const t = window.setTimeout(() => colEl.classList.remove(styles.reelBounce), 380)
    return () => window.clearTimeout(t)
  }, [stopping])

  return (
    <div ref={colRef} className={styles.reelCol} style={{ width: SYMBOL_W, height: REEL_H }}>
      <div
        ref={stripRef}
        className={`${styles.reelStrip} ${showStrip ? styles.reelStripBlur : ''}`}
        style={{ gap: ROW_GAP }}
      >
        {showStrip
          ? stripIds.map((id, i) => (
              <SymbolView
                key={`s-${col}-${i}`}
                id={id}
                gold={false}
                goldMult={1}
                win={false}
                goldActivating={false}
                stagger={0}
              />
            ))
          : cells.slice(0, VISIBLE_ROWS).map((cell, row) => (
              <SymbolView
                key={`g-${col}-${row}-${cell.id}`}
                id={cell.id}
                gold={cell.gold}
                goldMult={cell.goldMult}
                win={winningCells.has(`${col}:${row}`)}
                goldActivating={goldActivating.has(`${col}:${row}`)}
                stagger={col + row}
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
  goldActivating = new Set(),
  turbo,
}: Props) {
  return (
    <div
      className={styles.reelWindow}
      style={{ left: REEL_X, top: REEL_Y, width: REEL_W, height: REEL_H }}
      aria-label="Reel machine"
    >
      <div className={styles.reelViewport} style={{ gap: COL_GAP }}>
        {Array.from({ length: COLS }, (_, col) => (
          <ReelColumn
            key={col}
            col={col}
            cells={grid[col] ?? []}
            spinning={spinning}
            stopping={stoppingReels[col] === true}
            winningCells={winningCells}
            goldActivating={goldActivating}
            turbo={turbo}
          />
        ))}
      </div>
    </div>
  )
})
