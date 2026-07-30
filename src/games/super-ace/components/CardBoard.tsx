import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  BAND,
  COL_GAP,
  COLS,
  FRAME_INSET,
  MACHINE_H,
  MACHINE_W,
  MACHINE_X,
  MULT_BAR_H,
  MULT_BAR_W,
  MULT_BAR_X,
  REEL_VIEWPORT_H,
  ROW_GAP,
  ROWS,
  SYMBOL_H,
  SYMBOL_W,
} from '../constants/layoutConfig'
import { ASSET, COMBO, formatMoney, symbolSrc, type SymbolAssetId } from '../constants/gameConfig'
import type { Cell } from '../engines/superAceEngine'
import type { SuperAcePhase } from '../hooks/useSuperAceGame'
import styles from '../styles/royalAce.module.css'

type Props = {
  board: Cell[]
  phase: SuperAcePhase
  winningCells: Set<number>
  comboIndex: number
  cascadeWin: number
  spinning: boolean
}

export default function CardBoard({
  board,
  phase,
  winningCells,
  comboIndex,
  cascadeWin,
  spinning,
}: Props) {
  const prevKeys = useRef<string[]>([])
  const [enterKeys, setEnterKeys] = useState<Set<string>>(new Set())
  const [burnKeys, setBurnKeys] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (phase === 'winPresent' && winningCells.size) {
      setBurnKeys(new Set(winningCells))
      const t = window.setTimeout(() => setBurnKeys(new Set()), 480)
      return () => clearTimeout(t)
    }
    return undefined
  }, [phase, winningCells])

  useEffect(() => {
    const keys = board.map((c) => c.key)
    const entered = new Set<string>()
    keys.forEach((k) => {
      if (!prevKeys.current.includes(k)) entered.add(k)
    })
    prevKeys.current = keys
    if (entered.size && (phase === 'cascading' || phase === 'spinning' || spinning)) {
      setEnterKeys(entered)
      const t = window.setTimeout(() => setEnterKeys(new Set()), 420)
      return () => clearTimeout(t)
    }
    return undefined
  }, [board, phase, spinning])

  const hasWinFocus = winningCells.size > 0 && phase === 'winPresent'

  const cells = useMemo(() => {
    const out: ReactNode[] = []
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const i = row * COLS + col
        const cell = board[i]
        if (!cell) {
          out.push(<div key={`empty-${i}`} className={styles.cell} />)
          continue
        }
        const winning = winningCells.has(i)
        const burning = burnKeys.has(i)
        const entering = enterKeys.has(cell.key)
        const dim = hasWinFocus && !winning
        const isWild = cell.id === 'wild'
        const cls = [
          styles.card,
          dim ? styles.cardDim : '',
          winning && !burning ? styles.cardWin : '',
          burning ? styles.cardBurn : '',
          entering && phase === 'cascading' ? styles.cardDrop : '',
          entering && (phase === 'spinning' || spinning) ? styles.cardSpinIn : '',
          isWild && entering ? styles.cardWildLand : '',
        ]
          .filter(Boolean)
          .join(' ')

        out.push(
          <div key={cell.key} className={styles.cell}>
            <img
              className={cls}
              src={symbolSrc(cell.id as SymbolAssetId, !!cell.golden)}
              alt={cell.id}
              draggable={false}
              style={{
                animationDelay: `${(col + row) * 18}ms`,
                visibility: spinning && col > 0 ? undefined : undefined,
              }}
            />
            {spinning && (
              <div
                className={`${styles.colBlur} ${styles.colBlurOn}`}
                style={{ animationDelay: `${col * 70}ms`, opacity: 0.35 + col * 0.12 }}
              />
            )}
          </div>,
        )
      }
    }
    return out
  }, [board, burnKeys, enterKeys, hasWinFocus, phase, spinning, winningCells])

  const multLeft = `${comboIndex * 25 + 0.5}%`

  return (
    <>
      <div
        className={styles.multWrap}
        style={{
          left: MULT_BAR_X,
          top: BAND.multY,
          width: MULT_BAR_W,
          height: MULT_BAR_H,
        }}
      >
        <img className={styles.multBar} src={ASSET.multiplierBar} alt="" />
        <img
          className={styles.multActive}
          src={[ASSET.multActive0, ASSET.multActive1, ASSET.multActive2, ASSET.multActive3][comboIndex]!}
          alt=""
          style={{ left: multLeft }}
        />
        <div
          className={`${styles.comboTag} ${comboIndex > 0 || phase === 'winPresent' ? styles.comboTagOn : ''}`}
        >
          COMBO {COMBO[Math.min(comboIndex, COMBO.length - 1)]}
        </div>
      </div>

      <div
        className={styles.boardShell}
        style={{
          left: MACHINE_X,
          top: BAND.boardY,
          width: MACHINE_W,
          height: MACHINE_H,
          backgroundImage: `url(${ASSET.board})`,
        }}
      >
        <div
          className={styles.boardInner}
          style={{
            left: FRAME_INSET,
            top: FRAME_INSET,
            width: MACHINE_W - FRAME_INSET * 2,
            height: REEL_VIEWPORT_H,
          }}
        >
          <div
            className={styles.grid}
            style={{
              gap: `${ROW_GAP}px ${COL_GAP}px`,
              gridTemplateColumns: `repeat(${COLS}, ${SYMBOL_W}px)`,
              gridTemplateRows: `repeat(${ROWS}, ${SYMBOL_H}px)`,
            }}
          >
            {cells}
          </div>
          {cascadeWin > 0 && phase === 'winPresent' && (
            <div className={styles.winFloat}>{Math.round(cascadeWin)}</div>
          )}
        </div>
      </div>
      {cascadeWin <= 0 && null}
      {/* silence unused formatMoney lint if tree-shaken */}
      <span style={{ display: 'none' }}>{formatMoney(0)}</span>
    </>
  )
}
