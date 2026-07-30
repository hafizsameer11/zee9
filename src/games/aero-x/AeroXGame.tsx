import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import type { GameComponentProps } from '../types'
import {
  getDesignCanvasStyle,
  getDesignScaleShellStyle,
  useDesignScale,
} from '../hooks/useDesignScale'
import Zee9LoadingScreen from '../../components/Zee9LoadingScreen'
import { CTRL, UI } from './constants/assetManifest'
import { DESIGN_H, DESIGN_W, formatRs, historyTone } from './constants/gameConfig'
import BetPanel from './components/BetPanel'
import FlightArena from './components/FlightArena'
import { useAeroXGame } from './hooks/useAeroXGame'
import { useAeroXSound } from './hooks/useAeroXSound'
import styles from './styles/aeroX.module.css'

export default function AeroXGame({ onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, DESIGN_W, DESIGN_H)
  const { balance, debit, credit, canAfford, refresh } = useWallet()
  const { muted, toggleMute, play } = useAeroXSound()

  const game = useAeroXGame({
    canAfford,
    debit,
    credit,
    onMessage,
    playSfx: (id) => play(id as Parameters<typeof play>[0]),
    refresh,
  })

  const histClass = (m: number) => {
    const t = historyTone(m)
    if (t === 'cyan') return styles.histCyan
    if (t === 'violet') return styles.histViolet
    if (t === 'pink') return styles.histPink
    return styles.histAccent
  }

  return (
    <div ref={viewportRef} className={styles.root}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div className={styles.canvas} style={getDesignCanvasStyle(layout)}>
          {game.phase === 'loading' ? (
            <Zee9LoadingScreen
              progress={game.loadProgress}
              title="AeroX"
              subtitle="Preparing flight…"
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
                <img src={CTRL.menu} alt="" />
              </button>
              <img
                className={styles.logo}
                src={UI.logo}
                alt="AeroX"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).src = UI.logoFallback
                }}
              />
            </div>
            <div className={styles.headerCenter}>
              <div className={styles.balancePill}>{formatRs(balance)}</div>
            </div>
            <div className={styles.headerRight}>
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
            </div>
          </header>

          <div className={styles.history}>
            <div className={styles.historyScroll}>
              {game.history.map((m, i) => (
                <span key={`${m}-${i}`} className={`${styles.histPill} ${histClass(m)}`}>
                  {m.toFixed(2)}x
                </span>
              ))}
            </div>
            <span className={styles.iconBtn} aria-hidden>
              <img src={CTRL.history} alt="" />
            </span>
          </div>

          <div className={styles.arenaWrap}>
            <FlightArena
              phase={game.phase}
              mult={game.mult}
              waitProgress={game.waitProgress}
              flightStart={game.flightStart}
              crashPoint={game.crashPoint}
            />
            <button
              type="button"
              className={styles.helpFab}
              aria-label="How to play"
              onClick={() => {
                play('click')
                game.setShowHelp(true)
              }}
            >
              <img
                src={CTRL.help}
                alt=""
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).src = CTRL.helpFallback
                }}
              />
            </button>
          </div>

          <div className={styles.betRow}>
            {([0, 1] as const).map((i) => (
              <BetPanel
                key={i}
                index={i}
                slot={game.slots[i]}
                phase={game.phase}
                mult={game.mult}
                onAmount={(n) => game.setAmount(i, n)}
                onTab={(tab) => game.setTab(i, tab)}
                onAutoAt={(n) => game.setAuto(i, true, n)}
                onAction={() => game.placeOrCash(i)}
                onClickSfx={() => play('click')}
              />
            ))}
          </div>

          {game.showHelp && (
            <div className={styles.helpModal}>
              <div className={styles.helpCard}>
                <h3>How to play AeroX</h3>
                <p>
                  Place a bet before the round starts. Watch the multiplier climb as the courier
                  flies. Cash out before they fly away to lock in your win.
                </p>
                <p>Both panels work independently — run two strategies at once.</p>
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
  )
}
