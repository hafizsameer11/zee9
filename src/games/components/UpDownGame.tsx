import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { rollTwoDice, upDownPayout, type UpDownChoice } from '../engines/dice'
import type { GameComponentProps } from '../types'
import { useDesignScale } from '../hooks/useDesignScale'
import UpDownDesignUI from './UpDownDesignUI'
import styles from './premiumFrame.module.css'

const LIVE_FEED = [
  { initials: 'AK', name: 'Ahmed_K', bet: 500, pick: '7 UP' as const, status: 'won' as const },
  { initials: 'SN', name: 'Sana92', bet: 200, pick: 'Lucky 7' as const, status: 'rolling' as const },
  { initials: 'BR', name: 'Bilal.R', bet: 1000, pick: '7 DOWN' as const, status: 'lost' as const },
  { initials: 'ZR', name: 'Zara_R', bet: 300, pick: '7 UP' as const, status: 'rolling' as const },
  { initials: 'HM', name: 'Hamza_M', bet: 150, pick: 'Lucky 7' as const, status: 'won' as const },
  { initials: 'FK', name: 'Faris_K', bet: 750, pick: '7 UP' as const, status: 'rolling' as const },
]

const LIVE_WINS = [
  { name: 'Ahmed_K', amount: 12500, pick: '7 UP' },
  { name: 'Sana92', amount: 4500, pick: 'Lucky 7' },
  { name: 'Bilal.R', amount: 2000, pick: '7 DOWN' },
]

function formatPkr(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function UpDownGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef)
  const { balance, debit, credit, canAfford } = useWallet()

  const [betAmount, setBetAmount] = useState(defaultBet)
  const [choice, setChoice] = useState<UpDownChoice | null>(null)
  const [dice, setDice] = useState<[number, number] | null>(null)
  const [rolling, setRolling] = useState(false)
  const [history, setHistory] = useState<number[]>([9, 4, 7, 11, 3, 10, 6, 8, 5, 12, 2, 9])
  const [roundNo, setRoundNo] = useState(58412)
  const [lastResult, setLastResult] = useState<{ won: boolean; sum: number; win: number; pick: UpDownChoice } | null>(null)

  const play = useCallback(() => {
    if (rolling) return
    if (!choice) {
      onMessage?.('Pick a bet zone first')
      return
    }
    if (!canAfford(betAmount) || !debit(betAmount)) {
      onMessage?.('Insufficient balance')
      return
    }
    setRolling(true)
    setLastResult(null)
    onMessage?.(null)

    let ticks = 0
    const interval = setInterval(() => {
      setDice(rollTwoDice())
      ticks++
      if (ticks >= 8) {
        clearInterval(interval)
        const rolled = rollTwoDice()
        setDice(rolled)
        setRolling(false)
        const sum = rolled[0]! + rolled[1]!
        const mult = upDownPayout(choice, sum)
        const won = mult > 0
        const win = won ? betAmount * mult : 0
        if (won) credit(win)
        setHistory((h) => [sum, ...h].slice(0, 12))
        setRoundNo((n) => n + 1)
        setLastResult({ won, sum, win, pick: choice })
        if (won) onMessage?.(`🎉 Won PKR ${formatPkr(win)}!`)
        else onMessage?.(`Sum ${sum} — try again`)
      }
    }, 70)
  }, [betAmount, canAfford, choice, credit, debit, onMessage, rolling])

  const sum = dice && !rolling ? dice[0]! + dice[1]! : null
  const potentialWin = choice ? betAmount * (choice === 'seven' ? 5 : 2) : 0

  return (
    <UpDownDesignUI
      viewportRef={viewportRef}
      layout={layout}
      rootClassName={styles.root}
      canvasClassName={styles.canvas}
      balance={balance}
      betAmount={betAmount}
      choice={choice}
      dice={dice}
      rolling={rolling}
      sum={sum}
      history={history}
      roundNo={roundNo}
      lastResult={lastResult}
      liveFeed={LIVE_FEED}
      liveWins={LIVE_WINS}
      potentialWin={potentialWin}
      onChoice={setChoice}
      onBetAmount={setBetAmount}
      onRoll={play}
      onHome={() => navigate('/home')}
    />
  )
}