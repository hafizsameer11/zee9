import type { RefObject } from 'react'
import type { GemsMultiplier, GemsSymbol } from '../engines/fortuneGems'
import { GEMS_MULTIPLIERS } from '../engines/fortuneGems'
import { getDesignCanvasStyle, getDesignScaleShellStyle, type DesignLayout } from '../hooks/useDesignScale'
import { FG_ASSETS, UI_SPRITES, uiSpriteStyle } from './fortuneGemsAssets'
import { FortuneGemsFrame } from './FortuneGemsFrame'
import { GemsSymbolView, GemsWildBadge } from './fortuneGemsGfx'
import styles from './fortuneGems.module.css'

export type FortuneGemsDesignUIProps = {
  viewportRef: RefObject<HTMLDivElement | null>
  layout: DesignLayout
  rootClassName: string
  canvasClassName: string
  balance: number
  betAmount: number
  grid: GemsSymbol[]
  multiplier: GemsMultiplier
  spinning: boolean
  lastWin: number
  winCells: Set<number>
  bigWin: string | null
  onBetMinus: () => void
  onBetPlus: () => void
  onSpin: () => void
  onHome: () => void
}

function formatNum(n: number) {
  return n.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

export default function FortuneGemsDesignUI({
  viewportRef,
  layout,
  rootClassName,
  canvasClassName,
  balance,
  betAmount,
  grid,
  multiplier,
  spinning,
  lastWin,
  winCells,
  bigWin,
  onBetMinus,
  onBetPlus,
  onSpin,
  onHome,
}: FortuneGemsDesignUIProps) {
  const multIndex = GEMS_MULTIPLIERS.indexOf(multiplier)

  return (
    <div className={rootClassName} ref={viewportRef}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div className={canvasClassName} style={getDesignCanvasStyle(layout)}>
          <div className={styles.fgScreen}>
            <header className={styles.fgHeader}>
              <button type="button" className={styles.fgBackBtn} onClick={onHome} aria-label="Back">
                <span className={styles.fgBackIcon}>←</span>
              </button>
              <div className={styles.fgLogoWrap}>
                <span className={styles.fgLogoSprite} style={uiSpriteStyle(UI_SPRITES.logo, 26)} />
              </div>
              <div className={styles.fgHeaderRight}>
                <span className={styles.fgWinMultLabel}>WIN MULTIPLIER</span>
                <button type="button" className={styles.fgAddBtn}>
                  ADD
                </button>
                <button type="button" className={styles.fgMenuBtn} aria-label="Menu">
                  ◆
                </button>
              </div>
            </header>

            <main className={styles.fgMain}>
              <div className={styles.fgMainBg} style={{ backgroundImage: `url(${FG_ASSETS.bgPlay})` }} />
              <div className={styles.fgSlotArea}>
                <FortuneGemsFrame showMultiplier multIndex={multIndex}>
                  {grid.map((symbol, i) => (
                    <div
                      key={i}
                      className={`${styles.fgReelCell} ${spinning ? styles.fgReelSpin : ''} ${winCells.has(i) ? styles.fgReelWin : ''}`}
                    >
                      <GemsSymbolView symbol={symbol} size={symbol === 'wild' ? 40 : 34} />
                      {symbol === 'wild' && <GemsWildBadge className={styles.fgWildBadge} />}
                    </div>
                  ))}
                </FortuneGemsFrame>
              </div>
              {bigWin && <div className={styles.fgBigWin}>{bigWin}</div>}
            </main>

            <footer className={styles.fgFooter}>
              <div className={styles.fgFooterLeft}>
                <button type="button" className={styles.fgIconBtn}>
                  EX
                </button>
                <button type="button" className={styles.fgIconBtn}>
                  ?
                </button>
              </div>

              <div className={styles.fgFooterStats}>
                <div className={styles.fgStat}>
                  <span className={styles.fgStatLabel}>BALANCE</span>
                  <span className={styles.fgStatValue}>{formatNum(balance)}</span>
                </div>
                <div className={styles.fgStat}>
                  <span className={styles.fgStatLabel}>BET</span>
                  <div className={styles.fgBetRow}>
                    <button type="button" className={styles.fgBetBtn} onClick={onBetMinus} disabled={spinning}>
                      −
                    </button>
                    <span className={styles.fgStatValue}>{formatNum(betAmount)}</span>
                    <button type="button" className={styles.fgBetBtn} onClick={onBetPlus} disabled={spinning}>
                      +
                    </button>
                  </div>
                </div>
                <div className={styles.fgStat}>
                  <span className={styles.fgStatLabel}>WIN</span>
                  <span className={styles.fgStatValue}>{formatNum(lastWin)}</span>
                </div>
              </div>

              <div className={styles.fgFooterRight}>
                <button type="button" className={styles.fgIconBtn} aria-label="Turbo">
                  ⚡
                </button>
                <button type="button" className={styles.fgIconBtn} aria-label="Auto spin">
                  ↻
                </button>
                <button
                  type="button"
                  className={styles.fgSpinBtn}
                  onClick={onSpin}
                  disabled={spinning}
                  aria-label="Spin"
                >
                  <span className={styles.fgSpinGfx} style={uiSpriteStyle(UI_SPRITES.btnSpin, 50)} />
                  <span className={styles.fgSpinText}>SPIN</span>
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
