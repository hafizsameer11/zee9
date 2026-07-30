import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import type { GameComponentProps } from '../types'
import {
  getDesignCanvasStyle,
  getDesignScaleShellStyle,
  useDesignScale,
} from '../hooks/useDesignScale'
import { AVATARS, CTRL, UI } from './constants/assetManifest'
import Zee9LoadingScreen from '../../components/Zee9LoadingScreen'
import {
  DESIGN_H,
  DESIGN_W,
  HISTORY_VISIBLE,
  formatNum,
  formatRs,
  historyTone,
} from './constants/gameConfig'
import BetPanel from './components/BetPanel'
import FlightArena from './components/FlightArena'
import PlayerPanel from './components/PlayerPanel'
import QuestModal from './components/QuestModal'
import SettingsPanel from './components/SettingsPanel'
import TrendModal from './components/TrendModal'
import { useAeroXGame } from './hooks/useAeroXGame'
import { useAeroXSound } from './hooks/useAeroXSound'
import styles from './styles/aeroX.module.css'
import AddCashModal from '../../components/s9/modals/AddCashModal'

export default function DoubleCrashGame({ onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, DESIGN_W, DESIGN_H)
  const { balance, debit, credit, canAfford, refresh } = useWallet()
  const { muted, toggleMute, play } = useAeroXSound()

  const [showAddCash, setShowAddCash] = useState(false)

  /** Quiet wallet errors only — cashouts use in-game badges, never the page toast. */
  const quietMsg = useCallback(
    (msg: string | null) => {
      if (!msg) return
      if (/cashed out/i.test(msg)) return
      if (/bet placed/i.test(msg)) return
      onMessage?.(msg)
    },
    [onMessage],
  )

  const game = useAeroXGame({
    canAfford,
    debit,
    credit,
    onMessage: quietMsg,
    playSfx: (id) => play(id as Parameters<typeof play>[0]),
    refresh,
  })

  const histClass = (m: number) => {
    const t = historyTone(m)
    if (t === 'cyan') return styles.histCyan
    if (t === 'violet') return styles.histViolet
    if (t === 'pink') return styles.histPink
    return styles.histGold
  }

  const lastCashBySlot = useMemo(() => {
    const map: [ { mult: number; amount: number } | null, { mult: number; amount: number } | null ] = [
      null,
      null,
    ]
    for (const b of game.cashBadges) {
      map[b.slot] = { mult: b.mult, amount: b.amount }
    }
    return map
  }, [game.cashBadges])

  const openAddCash = () => {
    play('click')
    setShowAddCash(true)
  }

  return (
    <>
    <div ref={viewportRef} className={styles.root}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div className={styles.canvas} style={getDesignCanvasStyle(layout)}>
          {game.phase === 'loading' ? (
            <Zee9LoadingScreen
              progress={game.loadProgress}
              title="Double Crash"
              subtitle="Preparing launch…"
            />
          ) : (
            <>
          <header
            className={styles.header}
            style={{ backgroundImage: `url(${UI.headerMetal})` }}
          >
            <div className={styles.headerLeft}>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Back"
                onClick={() => {
                  play('click')
                  navigate(-1)
                }}
              >
                <img src={CTRL.back} alt="" />
              </button>
              <img
                className={styles.logo}
                src={UI.logo}
                alt="Double Crash"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).src = UI.logoFallback
                }}
              />
              <div className={styles.profile}>
                <img src={AVATARS[0]} alt="" />
                <div>
                  <strong>Pilot</strong>
                  <span>ID · Double Crash</span>
                </div>
              </div>
            </div>

            <div className={styles.headerCenter}>
              <div className={styles.chipMini}>
                <img src={CTRL.chip} alt="" />
                <span>0</span>
              </div>
              <div
                className={styles.bankroll}
                style={{ backgroundImage: `url(${UI.bankroll})` }}
              >
                <span>BANKROLL</span>
                <strong>{formatNum(balance, 0)}</strong>
              </div>
            </div>

            <div className={styles.headerRight}>
              <button type="button" className={styles.addBtn} onClick={openAddCash}>
                <img src={CTRL.cart} alt="" />
                <span>ADD</span>
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={muted ? 'Unmute' : 'Mute'}
                onClick={() => {
                  toggleMute()
                  play('click')
                }}
              >
                <img src={muted ? CTRL.mute : CTRL.sound} alt="" />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Quests"
                onClick={() => {
                  play('click')
                  game.setShowQuest(true)
                }}
              >
                <img src={CTRL.quest} alt="" />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Settings"
                onClick={() => {
                  play('click')
                  game.setShowSettings(true)
                }}
              >
                <img src={CTRL.menu} alt="" />
              </button>
            </div>
          </header>

          <div className={styles.history}>
            <div className={styles.historyScroll}>
              {game.history.slice(0, HISTORY_VISIBLE).map((m, i) => (
                <span key={`${m}-${i}`} className={`${styles.histPill} ${histClass(m)}`}>
                  {m.toFixed(2)}x
                </span>
              ))}
            </div>
            <button
              type="button"
              className={styles.trendBtn}
              aria-label="Trend"
              onClick={() => {
                play('click')
                game.setShowTrend(true)
              }}
            >
              <img src={CTRL.trend} alt="" />
            </button>
          </div>

          <div className={styles.body}>
            <PlayerPanel players={game.players} />
            <div className={styles.arenaWrap}>
              <FlightArena
                phase={game.phase}
                mult={game.mult}
                waitProgress={game.waitProgress}
                waitLeft={game.waitLeft}
                flightStart={game.flightStart}
                crashPoint={game.crashPoint}
                players={game.players}
              />
              <div className={styles.cashBadgeStack}>
                {game.cashBadges.map((b) => (
                  <div key={b.id} className={styles.cashBadge} data-slot={b.slot}>
                    <em>Bet {b.slot + 1}</em>
                    <strong>{formatRs(b.amount)}</strong>
                    <span>@{b.mult.toFixed(2)}x</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.betRow}>
            {([0, 1] as const).map((i) => (
              <BetPanel
                key={i}
                index={i}
                slot={game.slots[i]}
                phase={game.phase}
                mult={game.mult}
                lastCash={lastCashBySlot[i]}
                onAmount={(n) => game.setAmount(i, n)}
                onAutoBet={(on) => game.setAutoBet(i, on)}
                onAutoEscape={(on, at) => game.setAutoEscape(i, on, at)}
                onAction={() => game.placeOrCash(i)}
                onClickSfx={() => play('click')}
              />
            ))}
          </div>

          {game.showTrend && (
            <TrendModal
              history={game.history}
              onClose={() => {
                play('click')
                game.setShowTrend(false)
              }}
            />
          )}

          {game.showSettings && (
            <SettingsPanel
              muted={muted}
              musicOn={game.musicOn}
              vibrateOn={game.vibrateOn}
              onToggleMute={() => {
                toggleMute()
                play('click')
              }}
              onToggleMusic={() => {
                play('click')
                game.setMusicOn(!game.musicOn)
              }}
              onToggleVibrate={() => {
                play('click')
                game.setVibrateOn(!game.vibrateOn)
              }}
              onHistory={() => {
                play('click')
                game.setShowSettings(false)
                game.setShowTrend(true)
              }}
              onRules={() => {
                play('click')
                game.setShowSettings(false)
                game.setShowHelp(true)
              }}
              onQuest={() => {
                play('click')
                game.setShowSettings(false)
                game.setShowQuest(true)
              }}
              onClose={() => {
                play('click')
                game.setShowSettings(false)
              }}
            />
          )}

          {game.showQuest && (
            <QuestModal
              onClose={() => {
                play('click')
                game.setShowQuest(false)
              }}
              onClaim={() => {
                play('cashout')
              }}
            />
          )}

          {game.showHelp && (
            <div className={styles.overlay} onClick={() => game.setShowHelp(false)}>
              <div className={styles.helpCard} onClick={(e) => e.stopPropagation()}>
                <h3>How to play Double Crash</h3>
                <p>
                  Place bets on either panel before launch. Watch the rocket climb — cash out before
                  it flies away to lock your multiplier.
                </p>
                <p>Both panels work independently. Use Auto Escape to cash out at a set multiplier.</p>
                <button
                  type="button"
                  onClick={() => {
                    play('click')
                    game.setShowHelp(false)
                  }}
                >
                  Got it
                </button>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
    {showAddCash && <AddCashModal onClose={() => setShowAddCash(false)} />}
    </>
  )
}
