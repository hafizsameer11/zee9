import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { sound } from '../../lib/sound'
import {
  evaluateGemsGrid,
  INTRO_STORAGE_KEY,
  spinGemsGrid,
  spinGemsMultiplier,
  type GemsMultiplier,
  type GemsSymbol,
} from '../engines/fortuneGems'
import type { GameComponentProps } from '../types'
import { roundLossMessage } from '../lib/roundResult'
import {
  DESIGN_H,
  DESIGN_W,
  getDesignCanvasStyle,
  getDesignScaleShellStyle,
  useDesignScale,
} from '../hooks/useDesignScale'
import FortuneGemsDesignUI from './FortuneGemsDesignUI'
import FortuneGemsIntro from './FortuneGemsIntro'
import styles from './fortuneGems.module.css'

const SPIN_FRAMES = 10
const SPIN_INTERVAL_MS = 70

export default function FortuneGemsGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, DESIGN_W, DESIGN_H)
  const spinTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { balance, debit, credit, canAfford } = useWallet()

  const [showIntro, setShowIntro] = useState(() => {
    try {
      return localStorage.getItem(INTRO_STORAGE_KEY) !== '1'
    } catch {
      return true
    }
  })

  const [betAmount, setBetAmount] = useState(Math.min(defaultBet, 10))
  const [grid, setGrid] = useState<GemsSymbol[]>(() => spinGemsGrid())
  const [multiplier, setMultiplier] = useState<GemsMultiplier>(() => spinGemsMultiplier())
  const [spinning, setSpinning] = useState(false)
  const [lastWin, setLastWin] = useState(0)
  const [bigWin, setBigWin] = useState<string | null>(null)
  const [winCells, setWinCells] = useState<Set<number>>(new Set())

  const clearSpinTimer = useCallback(() => {
    if (spinTimerRef.current !== null) {
      clearInterval(spinTimerRef.current)
      spinTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearSpinTimer(), [clearSpinTimer])

  const finishIntro = useCallback((skipNext: boolean) => {
    if (skipNext) {
      try {
        localStorage.setItem(INTRO_STORAGE_KEY, '1')
      } catch {
        /* ignore */
      }
    }
    setShowIntro(false)
  }, [])

  const spin = useCallback(() => {
    if (spinning) return
    if (!canAfford(betAmount)) {
      sound.play('error')
      onMessage?.('Low balance — add cash or lower your bet')
      return
    }
    if (!debit(betAmount)) {
      sound.play('error')
      onMessage?.('Could not place bet — try again')
      return
    }

    clearSpinTimer()
    sound.play('spin', { volume: 0.55 })
    setSpinning(true)
    setBigWin(null)
    setWinCells(new Set())
    setLastWin(0)
    onMessage?.(null)

    let frame = 0
    spinTimerRef.current = setInterval(() => {
      setGrid(spinGemsGrid())
      setMultiplier(spinGemsMultiplier())
      frame += 1

      if (frame >= SPIN_FRAMES) {
        clearSpinTimer()

        const finalGrid = spinGemsGrid()
        const finalMult = spinGemsMultiplier()
        setGrid(finalGrid)
        setMultiplier(finalMult)

        const result = evaluateGemsGrid(finalGrid, betAmount, finalMult)
        setSpinning(false)

        if (result.payout > 0) {
          credit(result.payout)
          setLastWin(result.payout)
          const cells = new Set<number>()
          if (result.fullBoard) {
            for (let i = 0; i < 9; i++) cells.add(i)
            setBigWin(`FULL BOARD! PKR ${result.payout.toLocaleString()}`)
            sound.play('levelUp')
            onMessage?.(`🎉 Full board · PKR ${result.payout.toLocaleString()}!`)
          } else {
            result.lines.forEach((line) => line.cells.forEach((c) => cells.add(c)))
            setBigWin(`WIN PKR ${result.payout.toLocaleString()}`)
            sound.play('win')
            onMessage?.(`🎉 Win · PKR ${result.payout.toLocaleString()} (${finalMult}x)`)
          }
          setWinCells(cells)
        } else {
          sound.play('lose', { volume: 0.45 })
          onMessage?.(roundLossMessage(betAmount))
        }
      }
    }, SPIN_INTERVAL_MS)
  }, [betAmount, canAfford, clearSpinTimer, credit, debit, onMessage, spinning])

  const adjustBet = (delta: number) => {
    if (spinning) return
    setBetAmount((b) => Math.max(1, Math.min(500, b + delta)))
  }

  if (showIntro) {
    return (
      <div className={styles.root} ref={viewportRef}>
        <div style={getDesignScaleShellStyle(layout)}>
          <div className={styles.canvas} style={getDesignCanvasStyle(layout)}>
            <FortuneGemsIntro onContinue={finishIntro} onBack={() => navigate('/home')} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <FortuneGemsDesignUI
      viewportRef={viewportRef}
      layout={layout}
      rootClassName={styles.root}
      canvasClassName={styles.canvas}
      balance={balance}
      betAmount={betAmount}
      grid={grid}
      multiplier={multiplier}
      spinning={spinning}
      lastWin={lastWin}
      winCells={winCells}
      bigWin={bigWin}
      onBetMinus={() => adjustBet(-1)}
      onBetPlus={() => adjustBet(1)}
      onSpin={spin}
      onHome={() => navigate('/home')}
    />
  )
}
