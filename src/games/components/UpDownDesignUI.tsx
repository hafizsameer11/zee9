import { useCallback, useState, type CSSProperties, type RefObject } from 'react'
import { getDesignCanvasStyle, getDesignScaleShellStyle, type DesignLayout } from '../hooks/useDesignScale'
import type { UpDownChoice } from '../engines/dice'
import styles from './upDownClassic.module.css'
import {
  CHIP_SELECTOR_VALUES,
  historySpriteForSum,
  UP_DOWN_HUD,
  UP_DOWN_IMG,
  UP_DOWN_SPRITES,
} from './upDownAssets'
import { AtlasSprite, SceneImage } from './upDownSprite'
import { zoneForSum } from './upDownClassicGfx'
import {
  CoinIcon,
  SelectorChip,
  TableChipImg,
  type ChipColor,
} from './upDownChips'

export type TableChip = {
  id: string
  value: number
  color: ChipColor
  x: number
  y: number
  rot: number
  zone: UpDownChoice
}

export type FlyingChip = {
  id: string
  value: number
  color: ChipColor
  fromX: number
  fromY: number
  toX: number
  toY: number
  delay?: number
}

export type AiPlayer = {
  id: string
  name: string
  balance: number
  badge?: 'WINNER' | 'LUCKY'
  side: 'left' | 'right'
  avatar: string
}

export type WinFloat = {
  id: string
  text: string
  x: number
  y: number
}

export type UpDownDesignUIProps = {
  viewportRef: RefObject<HTMLDivElement | null>
  layout: DesignLayout
  rootClassName: string
  canvasClassName: string
  balance: number
  playerName: string
  playerAvatar: string
  betAmount: number
  phase: 'betting' | 'rolling' | 'result'
  countdown: number
  roundSec: number
  history: number[]
  zoneTotals: Record<UpDownChoice, number>
  tableChips: TableChip[]
  flyingChips: FlyingChip[]
  winFloats: WinFloat[]
  aiPlayers: AiPlayer[]
  lastResult: { sum: number; won: boolean; win: number } | null
  winningZone: UpDownChoice | null
  onBetAmount: (n: number) => void
  onZoneBet: (zone: UpDownChoice) => void
  onRebet: () => void
  onHome: () => void
  onAddCash: () => void
  menuOpen: boolean
  onToggleMenu: () => void
  registerSeatRef: (playerId: string, el: HTMLDivElement | null) => void
  registerZoneRef: (zone: UpDownChoice, el: HTMLDivElement | null) => void
  registerSelfRef: (el: HTMLDivElement | null) => void
}

const ZONES: {
  id: UpDownChoice
  mult: string
  range: string
  bar: string
}[] = [
  { id: 'down', mult: 'X2', range: '2–6', bar: styles.zoneBetBarDown! },
  { id: 'seven', mult: 'X5', range: '7', bar: styles.zoneBetBarSeven! },
  { id: 'up', mult: 'X2', range: '8–12', bar: styles.zoneBetBarUp! },
]

const ZONE_HEAD_CLASS: Record<UpDownChoice, string> = {
  down: styles.zoneHead_down!,
  seven: styles.zoneHead_seven!,
  up: styles.zoneHead_up!,
}

const ZONE_PLAY_CLASS: Record<UpDownChoice, string> = {
  down: styles.zonePlay_down!,
  seven: styles.zonePlay_seven!,
  up: styles.zonePlay_up!,
}

function formatNum(n: number) {
  return n.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

function HudImgBtn({
  src,
  alt,
  className,
  onClick,
}: {
  src: string
  alt: string
  className?: string
  onClick?: () => void
}) {
  return (
    <button type="button" className={`${styles.hudIconBtn} ${className ?? ''}`} onClick={onClick} aria-label={alt}>
      <img src={src} alt="" draggable={false} />
    </button>
  )
}

function Avatar({ src, name, className }: { src: string; name: string; className: string }) {
  const [failed, setFailed] = useState(false)
  const initials = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?'

  if (failed) {
    return (
      <span className={`${styles.avatarFallback} ${className}`} aria-hidden>
        {initials}
      </span>
    )
  }

  return <img src={src} className={className} alt="" onError={() => setFailed(true)} />
}

function TimerRing({ countdown, max }: { countdown: number; max: number }) {
  const r = 22
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, countdown / max))
  return (
    <svg className={styles.timerRingSvg} viewBox="0 0 52 52" aria-hidden>
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="4" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke="#f5c518"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${c * p} ${c}`}
      />
    </svg>
  )
}

function FlyingChipView({ color, fromX, fromY, toX, toY, delay }: FlyingChip) {
  return (
    <div
      className={styles.flyingChip}
      style={
        {
          '--from-x': `${fromX}px`,
          '--from-y': `${fromY}px`,
          '--to-x': `${toX}px`,
          '--to-y': `${toY}px`,
          '--delay': `${delay ?? 0}ms`,
        } as CSSProperties
      }
    >
      <TableChipImg color={color} size={26} />
    </div>
  )
}

export default function UpDownDesignUI({
  viewportRef,
  layout,
  rootClassName,
  canvasClassName,
  balance,
  playerName,
  playerAvatar,
  betAmount,
  phase,
  countdown,
  roundSec,
  history,
  zoneTotals,
  tableChips,
  flyingChips,
  winFloats,
  aiPlayers,
  lastResult,
  winningZone,
  onBetAmount,
  onZoneBet,
  onRebet,
  onHome,
  onAddCash,
  menuOpen,
  onToggleMenu,
  registerSeatRef,
  registerZoneRef,
  registerSelfRef,
}: UpDownDesignUIProps) {
  const canBet = phase === 'betting'
  const leftPlayers = aiPlayers.filter((p) => p.side === 'left')
  const rightPlayers = aiPlayers.filter((p) => p.side === 'right')

  const chipsForZone = useCallback(
    (zone: UpDownChoice) => tableChips.filter((c) => c.zone === zone),
    [tableChips],
  )

  return (
    <div className={rootClassName} ref={viewportRef}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div className={canvasClassName} style={getDesignCanvasStyle(layout)}>
          <div className={styles.scene} data-updown-play-area>
            <SceneImage src={UP_DOWN_IMG.roomBg} className={styles.roomBg} alt="" />
            <div className={styles.roomVignette} aria-hidden />

            {/* ── Top HUD ── */}
            <header className={styles.hudTop}>
              <div className={styles.hudTopLeft}>
                <HudImgBtn src={UP_DOWN_HUD.back} alt="Back" onClick={onHome} />
                <img src={UP_DOWN_HUD.promo} className={styles.hudPromo} alt="Play Game Rs10" draggable={false} />
              </div>

              <div className={styles.hudTopCenter}>
                <div className={styles.timerDock}>
                  <TimerRing countdown={countdown} max={roundSec} />
                  <img src={UP_DOWN_HUD.shaker} className={styles.hudShakerImg} alt="" draggable={false} />
                  <span className={styles.timerNum}>{countdown}</span>
                </div>
              </div>

              <div className={styles.hudTopRight}>
                <HudImgBtn src={UP_DOWN_HUD.add} alt="Add chips" onClick={onAddCash} />
                <HudImgBtn src={UP_DOWN_HUD.menu} alt="Menu" onClick={onToggleMenu} />
                {menuOpen && (
                  <div className={styles.menuPanel} role="menu">
                    <button type="button" className={styles.menuItem} onClick={onHome}>
                      Exit to lobby
                    </button>
                    <button type="button" className={styles.menuItem} onClick={onAddCash}>
                      Add cash
                    </button>
                    <button type="button" className={styles.menuItem} onClick={onToggleMenu}>
                      Close
                    </button>
                  </div>
                )}
              </div>
            </header>

            <div className={styles.tableWrap}>
              <div className={`${styles.playerDock} ${styles.playerDockLeft}`}>
                {leftPlayers.map((p) => (
                  <div key={p.id} className={styles.playerSeat} ref={(el) => registerSeatRef(p.id, el)}>
                    {p.badge === 'WINNER' && (
                      <AtlasSprite def={UP_DOWN_SPRITES.winnerBadge} className={styles.playerBadge} scale={1} alt="" />
                    )}
                    <Avatar src={p.avatar} name={p.name} className={styles.playerFace} />
                    <span className={styles.playerName}>{p.name}</span>
                    <span className={styles.playerBal}>
                      <CoinIcon size={11} />
                      {formatNum(p.balance)}
                    </span>
                  </div>
                ))}
              </div>

              <div className={styles.tableStage}>
                <SceneImage src={UP_DOWN_IMG.table} className={styles.tableImg} alt="" />
                <SceneImage src={UP_DOWN_IMG.zones} className={styles.zonesImg} alt="" />

                <div className={styles.historyBar}>
                  <div className={styles.historyTrack}>
                    {history.slice(0, 14).map((h, i) => (
                      <span key={`${h}-${i}`} className={styles.histItem}>
                        <AtlasSprite def={historySpriteForSum(h)} scale={0.44} />
                        <span className={styles.histNum}>{h}</span>
                      </span>
                    ))}
                  </div>
                  <AtlasSprite def={UP_DOWN_SPRITES.histNew} className={styles.histNew} scale={0.44} />
                  <AtlasSprite def={UP_DOWN_SPRITES.histChart} className={styles.histChart} scale={0.4} />
                </div>

                <div className={styles.tableInner}>
                  {ZONES.map((z) => (
                    <div
                      key={`head-${z.id}`}
                      className={`${styles.zoneTotalCell} ${z.bar} ${ZONE_HEAD_CLASS[z.id]}`}
                    >
                      <div className={z.id === 'seven' ? styles.zoneNumsSeven : styles.zoneNums}>
                        <span className={styles.zoneRange}>{z.range}</span>
                        <span className={styles.zoneTotalAmt}>
                          <CoinIcon size={10} />
                          {formatNum(zoneTotals[z.id])}
                        </span>
                        {z.id === 'up' && zoneTotals.up >= zoneTotals.down && (
                          <span className={styles.zoneStar}>★</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {ZONES.map((z) => (
                    <button
                      key={`bet-${z.id}`}
                      type="button"
                      className={`${styles.zoneBetBtn} ${ZONE_PLAY_CLASS[z.id]} ${winningZone === z.id ? styles.zoneColWin : ''}`}
                      disabled={!canBet}
                      onClick={() => onZoneBet(z.id)}
                    >
                      <div className={styles.zonePlayfield} ref={(el) => registerZoneRef(z.id, el)}>
                        {chipsForZone(z.id).map((c) => (
                          <TableChipImg
                            key={c.id}
                            color={c.color}
                            size={22 + (c.value >= 500 ? 4 : c.value >= 100 ? 2 : 0)}
                            className={styles.tableChip}
                            style={{
                              left: `${c.x}%`,
                              top: `${c.y}%`,
                              transform: `translate(-50%, -50%) rotate(${c.rot}deg)`,
                            }}
                          />
                        ))}
                        <span className={styles.zoneMult}>{z.mult}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {phase === 'result' && lastResult && (
                  <div className={styles.resultVeil}>
                    <div className={styles.resultCard}>
                      <div className={styles.resultSum}>{lastResult.sum}</div>
                      <div className={styles.resultZone}>
                        {zoneForSum(lastResult.sum) === 'down'
                          ? '2–6 DOWN'
                          : zoneForSum(lastResult.sum) === 'up'
                            ? '8–12 UP'
                            : 'LUCKY 7'}
                      </div>
                      {lastResult.won ? (
                        <div className={styles.resultWin}>+{formatNum(lastResult.win)}</div>
                      ) : (
                        <div className={styles.resultLose}>Better luck next round</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className={`${styles.playerDock} ${styles.playerDockRight}`}>
                {rightPlayers.map((p) => (
                  <div key={p.id} className={styles.playerSeat} ref={(el) => registerSeatRef(p.id, el)}>
                    {p.badge === 'LUCKY' && (
                      <AtlasSprite def={UP_DOWN_SPRITES.luckyBadge} className={styles.playerBadge} scale={1} alt="" />
                    )}
                    <Avatar src={p.avatar} name={p.name} className={styles.playerFace} />
                    <span className={styles.playerName}>{p.name}</span>
                    <span className={styles.playerBal}>
                      <CoinIcon size={11} />
                      {formatNum(p.balance)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.fxLayer}>
              {flyingChips.map((fc) => (
                <FlyingChipView key={fc.id} {...fc} />
              ))}
              {winFloats.map((wf) => (
                <span key={wf.id} className={styles.winFloat} style={{ left: wf.x, top: wf.y }}>
                  {wf.text}
                </span>
              ))}
            </div>

            {/* ── Bottom HUD ── */}
            <footer className={styles.hudBottom}>
              <div className={styles.hudBottomLeft}>
                <HudImgBtn src={UP_DOWN_HUD.social} alt="Social" />
                <div className={styles.selfDock} ref={registerSelfRef}>
                  <Avatar src={playerAvatar} name={playerName} className={styles.selfFace} />
                  <div className={styles.selfMeta}>
                    <span className={styles.selfName}>{playerName}</span>
                    <span className={styles.selfBal}>
                      <CoinIcon size={12} />
                      {formatNum(balance)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.chipTray}>
                <button
                  type="button"
                  className={styles.trayArrow}
                  aria-label="Previous"
                  onClick={() => {
                    const idx = CHIP_SELECTOR_VALUES.indexOf(betAmount as (typeof CHIP_SELECTOR_VALUES)[number])
                    const i = idx <= 0 ? CHIP_SELECTOR_VALUES.length - 1 : idx - 1
                    onBetAmount(CHIP_SELECTOR_VALUES[i]!)
                  }}
                >
                  ‹
                </button>
                <div className={styles.chipPickRow}>
                  {CHIP_SELECTOR_VALUES.map((v) => (
                    <SelectorChip
                      key={v}
                      value={v}
                      selected={betAmount === v}
                      onClick={() => onBetAmount(v)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className={styles.trayArrow}
                  aria-label="Next"
                  onClick={() => {
                    const idx = CHIP_SELECTOR_VALUES.indexOf(betAmount as (typeof CHIP_SELECTOR_VALUES)[number])
                    const i = idx < 0 || idx >= CHIP_SELECTOR_VALUES.length - 1 ? 0 : idx + 1
                    onBetAmount(CHIP_SELECTOR_VALUES[i]!)
                  }}
                >
                  ›
                </button>
              </div>

              <div className={styles.hudBottomRight}>
                <button
                  type="button"
                  className={styles.rebetBtn}
                  disabled={!canBet}
                  onClick={onRebet}
                  aria-label="ReBet"
                >
                  ReBet
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
