import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import Zee9LoadingScreen from '../../components/Zee9LoadingScreen'
import { type JhandiSymbol } from '../engines/dice'
import { getDesignCanvasStyle, getDesignScaleShellStyle, useDesignScale } from '../hooks/useDesignScale'
import type { GameComponentProps } from '../types'
import { BOOT_PRELOAD, avatarImg, CHIP_IMG_SM, IMG } from './assets'
import { formatAmount } from './chips'
import BettingPanel from './components/BettingPanel'
import Dice2DLayer from './components/Dice2DLayer'
import {
  AVATAR_ROW,
  BET_GRID,
  CHIP_VALUES,
  CUP,
  DEALER,
  DESIGN_H,
  DESIGN_W,
  SYMBOL_ORDER,
  TABLE,
  TIMER,
  TITLE,
  type ChipValue,
} from './constants'
import { useJhandiGame } from './hooks/useJhandiGame'
import styles from './jhandiMunda.module.css'

function preloadUrls(urls: string[]): Promise<void> {
  return Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => resolve()
          img.src = src
        }),
    ),
  ).then(() => undefined)
}

export default function JhandiMundaGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, DESIGN_W, DESIGN_H)
  const wallet = useWallet()
  const zoneRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const trayRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1)
  scaleRef.current = layout.scale

  const [ready, setReady] = useState(false)
  const [loadProgress, setLoadProgress] = useState(4)

  useEffect(() => {
    let cancelled = false
    const total = BOOT_PRELOAD.length
    let done = 0
    const tick = () => {
      if (!cancelled) setLoadProgress(Math.min(96, Math.round((done / total) * 96) + 4))
    }
    void Promise.all(
      BOOT_PRELOAD.map((url) =>
        preloadUrls([url]).then(() => {
          done++
          tick()
        }),
      ),
    ).then(() => {
      if (!cancelled) {
        setLoadProgress(100)
        setReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const game = useJhandiGame(wallet, defaultBet, onMessage)

  const centerOf = useCallback((el: HTMLElement | null) => {
    const scene = sceneRef.current
    if (!el || !scene) return null
    const s = scaleRef.current || 1
    const sr = scene.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    return { x: (r.left + r.width / 2 - sr.left) / s, y: (r.top + r.height / 2 - sr.top) / s }
  }, [])

  const registerZoneRef = useCallback((sym: JhandiSymbol, el: HTMLButtonElement | null) => {
    zoneRefs.current[sym] = el
  }, [])

  const handleBet = useCallback(
    (sym: JhandiSymbol) => {
      const from = centerOf(trayRef.current)
      const to = centerOf(zoneRefs.current[sym])
      if (!game.placeBet(sym, game.betAmount, from?.x, from?.y, to?.x, to?.y)) {
        onMessage?.('Insufficient balance')
      } else {
        onMessage?.(null)
      }
    },
    [centerOf, game, onMessage],
  )

  if (!ready) {
    return (
      <div className={styles.root} ref={viewportRef}>
        <Zee9LoadingScreen progress={loadProgress} title="JHANDI MUNDA" subtitle="Loading table…" />
      </div>
    )
  }

  const timerUrgent = game.countdown <= 5 && game.phase === 'betting'
  const timerCritical = game.countdown <= 3 && game.phase === 'betting'
  const showDice =
    game.phase === 'rolling' || game.phase === 'result' || game.phase === 'payout'
  const shaking = game.phase === 'shaking' || game.phase === 'rolling'
  const showCup = !showDice

  return (
    <div className={styles.root} ref={viewportRef}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div className={styles.canvas} style={getDesignCanvasStyle(layout)}>
          <div className={styles.scene} ref={sceneRef}>
            <div className={styles.roomBg} aria-hidden />

            <div
              className={styles.dealerStage}
              style={{ left: DEALER.left, top: DEALER.top, width: DEALER.width }}
            >
              <img
                src={IMG.dealerIdle}
                alt=""
                className={`${styles.dealer} ${shaking ? styles.dealerShake : ''}`}
                draggable={false}
              />
            </div>

            <img
              src={IMG.tableFrame}
              alt=""
              className={styles.tableImg}
              draggable={false}
              style={{
                left: TABLE.left,
                top: TABLE.top,
                width: TABLE.width,
                height: TABLE.height,
              }}
            />

            <div
              className={styles.tableOverlay}
              style={{
                left: TABLE.left,
                top: TABLE.top,
                width: TABLE.width,
                height: TABLE.height,
              }}
            >
              <h1 className={styles.tableTitle} style={{ top: TITLE.top, height: TITLE.height }}>
                Jhandi Munda
              </h1>

              {showCup && (
                <div
                  className={styles.cupWrap}
                  style={{
                    top: CUP.top,
                    width: CUP.width,
                    height: CUP.height,
                    left: (TABLE.width - CUP.width) / 2,
                  }}
                >
                  <img
                    src={IMG.cup}
                    alt=""
                    className={shaking ? styles.cupShake : styles.cupRest}
                    draggable={false}
                  />
                </div>
              )}

              <div
                className={styles.avatarRow}
                style={{
                  top: AVATAR_ROW.top,
                  height: AVATAR_ROW.height,
                  paddingLeft: AVATAR_ROW.pad,
                  paddingRight: AVATAR_ROW.pad,
                }}
              >
                {game.bots.map((b) => (
                  <div
                    key={b.id}
                    className={`${styles.avatar} ${game.activeBot === b.id ? styles.avatarPulse : ''}`}
                  >
                    <img src={avatarImg(b.avatar)} alt="" draggable={false} className={styles.avatarImg} />
                    {b.badge && <span className={styles.avatarBadge}>{b.badge}</span>}
                  </div>
                ))}
              </div>

              <div
                className={styles.betGrid}
                style={{
                  left: `${BET_GRID.left}%`,
                  top: `${BET_GRID.top}%`,
                  width: `${BET_GRID.width}%`,
                  height: `${BET_GRID.height}%`,
                  gap: BET_GRID.gap,
                  gridTemplateColumns: `repeat(${BET_GRID.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${BET_GRID.rows}, 1fr)`,
                }}
              >
                {SYMBOL_ORDER.map((sym) => (
                  <div key={sym} className={styles.betCell}>
                    <BettingPanel
                      symbol={sym}
                      pot={game.pots[sym]}
                      myBet={game.myBets[sym]}
                      canBet={game.canBet}
                      won={
                        game.winningSymbol === sym &&
                        (game.phase === 'result' || game.phase === 'payout')
                      }
                      dimmed={
                        game.winningSymbol != null &&
                        game.winningSymbol !== sym &&
                        (game.phase === 'result' || game.phase === 'payout')
                      }
                      history={game.history}
                      onBet={handleBet}
                      registerRef={registerZoneRef}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Dice2DLayer dice={game.diePositions} visible={showDice} />

            {game.winningSymbol && game.winMult > 0 && (game.phase === 'result' || game.phase === 'payout') && (
              <div className={styles.multOverlay}>
                <span className={styles.multText}>WIN ×{game.winMult}</span>
                {game.payout > 0 && <span className={styles.payoutText}>+{formatAmount(game.payout)}</span>}
              </div>
            )}

            {game.banner === 'place' && (
              <img src={IMG.placeBets} alt="Place your bets" className={styles.banner} draggable={false} />
            )}
            {game.banner === 'stop' && (
              <img src={IMG.stopBetting} alt="Betting closed" className={styles.bannerStop} draggable={false} />
            )}

            <div
              className={`${styles.timer} ${timerUrgent ? styles.timerUrgent : ''} ${timerCritical ? styles.timerCritical : ''}`}
              style={{ left: TIMER.left, top: TIMER.top, width: TIMER.size, height: TIMER.size }}
            >
              <img src={IMG.timer} alt="" className={styles.timerImg} draggable={false} />
              <span className={styles.timerNum}>{game.countdown}</span>
            </div>

            <header className={styles.topBar}>
              <button type="button" className={styles.backBtn} onClick={() => navigate('/home')} aria-label="Back">
                <img src={IMG.btnBack} alt="" draggable={false} />
              </button>
              <div className={styles.balance}>PKR {formatAmount(wallet.balance)}</div>
            </header>

            <div className={styles.fxLayer}>
              {game.flying.map((c) => (
                <img
                  key={c.id}
                  src={CHIP_IMG_SM[c.value]}
                  alt=""
                  draggable={false}
                  className={styles.flyChip}
                  style={
                    {
                      '--fx': `${c.fx}px`,
                      '--fy': `${c.fy}px`,
                      '--tx': `${c.tx}px`,
                      '--ty': `${c.ty}px`,
                      '--delay': `${c.delay}ms`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>

            <footer className={styles.controlDeck} ref={trayRef}>
              <div className={styles.chipTray}>
                {CHIP_VALUES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`${styles.chipBtn} ${game.betAmount === v ? styles.chipSelected : ''}`}
                    disabled={!game.canBet}
                    onClick={() => game.setBetAmount(v as ChipValue)}
                  >
                    <img src={CHIP_IMG_SM[v as ChipValue]} alt={`${v}`} draggable={false} />
                  </button>
                ))}
              </div>
              <div className={styles.actionBtns}>
                <button
                  type="button"
                  className={styles.rebetBtn}
                  disabled={!game.canRebet}
                  onClick={() => {
                    game.rebet()
                    onMessage?.(null)
                  }}
                >
                  ReBet
                </button>
                <button
                  type="button"
                  className={styles.clearBtn}
                  disabled={!game.canBet || game.myStake <= 0}
                  onClick={() => game.clearBets()}
                >
                  Clear
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
