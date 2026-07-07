import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import {
  OX_BIG_WIN_HISTORY,
  OX_SYMBOL_META,
  evaluateOxGrid,
  spinOxGrid,
  type OxSymbol,
} from '../engines/fortuneOx'
import type { GameComponentProps } from '../types'
import FortuneOxDesignUI from './FortuneOxDesignUI'
import styles from './premiumFrame.module.css'
import { useDesignScale } from '../hooks/useDesignScale'

const RECENT_WINS = [
  { initials: 'AK', name: 'Ahmed_K', pick: 'Ox Wild ×5', amount: 12500 },
  { initials: 'SN', name: 'Sana92', pick: 'Gold Coins', amount: 4200 },
  { initials: 'BR', name: 'Bilal.R', pick: 'Firecrackers', amount: 2000 },
  { initials: 'FY', name: 'Fayza.Y', pick: 'Gold Ingot', amount: 1650 },
]

const LIVE_TICKER = [
  { name: 'Ahmed_K', amount: 12500, pick: 'Ox Wild' },
  { name: 'Sana92', amount: 4200, pick: 'Gold Coin' },
  { name: 'Bilal.R', amount: 2000, pick: 'Firecracker' },
]

export default function FortuneOxGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef)
  const { balance, debit, credit, canAfford } = useWallet()

  const [betAmount, setBetAmount] = useState(defaultBet)
  const [grid, setGrid] = useState<OxSymbol[][]>(() => spinOxGrid())
  const [spinning, setSpinning] = useState(false)
  const [lastWin, setLastWin] = useState(0)
  const [bigWin, setBigWin] = useState<string | null>(null)
  const [winCells, setWinCells] = useState<Set<string>>(new Set())
  const [jackpot] = useState(1284500)

  const spin = useCallback(() => {
    if (spinning) return
    if (!canAfford(betAmount) || !debit(betAmount)) {
      onMessage?.('Insufficient balance')
      return
    }
    setSpinning(true)
    setBigWin(null)
    setWinCells(new Set())
    onMessage?.(null)

    const frames = 8
    let frame = 0
    const interval = setInterval(() => {
      setGrid(spinOxGrid())
      frame++
      if (frame >= frames) {
        clearInterval(interval)
        const result = spinOxGrid()
        setGrid(result)
        const evalResult = evaluateOxGrid(result, betAmount)
        setSpinning(false)
        if (evalResult && evalResult.payout > 0) {
          credit(evalResult.payout)
          setLastWin(evalResult.payout)
          const label = OX_SYMBOL_META[evalResult.symbol].label
          setBigWin(`BIG WIN · PKR ${evalResult.payout.toLocaleString()}`)
          onMessage?.(`🎉 ${label} · PKR ${evalResult.payout.toLocaleString()}!`)
          const cells = new Set<string>()
          for (let c = evalResult.start; c < evalResult.start + evalResult.count; c++) {
            cells.add(`${evalResult.winRow}-${c}`)
          }
          setWinCells(cells)
        } else {
          setLastWin(0)
          onMessage?.('No match — spin again')
        }
      }
    }, 80)
  }, [betAmount, canAfford, credit, debit, onMessage, spinning])

  const adjustBet = (delta: number) => {
    if (spinning) return
    setBetAmount((b) => Math.max(50, Math.min(5000, b + delta)))
  }

  useEffect(() => () => {}, [])

  return (
    <FortuneOxDesignUI
      viewportRef={viewportRef}
      layout={layout}
      rootClassName={styles.root}
      canvasClassName={styles.canvas}
      balance={balance}
      betAmount={betAmount}
      grid={grid}
      spinning={spinning}
      lastWin={lastWin}
      bigWin={bigWin}
      winCells={winCells}
      jackpot={jackpot}
      bigWinHistory={OX_BIG_WIN_HISTORY}
      recentWins={RECENT_WINS}
      liveTicker={LIVE_TICKER}
      onBetMinus={() => adjustBet(-50)}
      onBetPlus={() => adjustBet(50)}
      onQuickStake={setBetAmount}
      onSpin={spin}
      onHome={() => navigate('/home')}
    />
  )
}
