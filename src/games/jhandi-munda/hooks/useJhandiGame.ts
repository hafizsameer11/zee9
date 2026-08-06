import { useCallback, useEffect, useRef, useState } from 'react'
import {
  JHANDI_SYMBOLS,
  jhandiCounts,
  jhandiTotalPayout,
  rollJhandiDice,
  type JhandiSymbol,
} from '../../engines/dice'
import { roundLossMessage } from '../../lib/roundResult'
import { sound } from '../../../lib/sound'
import { SND } from '../assets'
import { chipFor } from '../chips'
import { CHIP_VALUES, DICE_LAND, ROUND_SEC, SYMBOL_ORDER, type ChipValue } from '../constants'

export type GamePhase =
  | 'betting'
  | 'closed'
  | 'shaking'
  | 'rolling'
  | 'result'
  | 'payout'
  | 'reset'

export type Bets = Record<JhandiSymbol, number>
export type Pots = Record<JhandiSymbol, number>

export type SimPlayer = {
  id: string
  name: string
  avatar: number
  badge?: 'HIGH ROLLER' | 'LUCKY' | 'VIP'
  total: number
  lastSymbol: JhandiSymbol | null
  lastAmount: number
}

const ZERO_BETS = (): Bets => Object.fromEntries(JHANDI_SYMBOLS.map((s) => [s, 0])) as Bets
const ZERO_POTS = (): Pots => Object.fromEntries(JHANDI_SYMBOLS.map((s) => [s, 0])) as Pots

const BOT_NAMES = ['Aria', 'Vikram', 'Meera', 'Raj', 'Sana', 'Lucky']
const BOT_BADGES: SimPlayer['badge'][] = ['HIGH ROLLER', undefined, 'VIP', undefined, 'LUCKY', undefined]

function makeBots(): SimPlayer[] {
  return BOT_NAMES.map((name, i) => ({
    id: `bot-${i}`,
    name,
    avatar: i,
    badge: BOT_BADGES[i],
    total: 0,
    lastSymbol: null,
    lastAmount: 0,
  }))
}

let uid = 0
export const nextFxId = () => `fx${++uid}`

export type FlyingChip = {
  id: string
  value: ChipValue
  fx: number
  fy: number
  tx: number
  ty: number
  delay: number
}

export type DieOnTable = {
  id: string
  symbol: JhandiSymbol
  x: number
  y: number
  rot: number
  delay: number
  settled: boolean
}

type WalletApi = {
  balance: number
  debit: (n: number) => boolean
  credit: (n: number) => void
  canAfford: (n: number) => boolean
  holdWin?: (amount: number) => void
  releaseWinHold?: () => void
}

export function useJhandiGame(
  wallet: WalletApi,
  defaultBet: number,
  onMessage?: (msg: string | null) => void,
) {
  const [phase, setPhase] = useState<GamePhase>('betting')
  const [countdown, setCountdown] = useState(ROUND_SEC)
  const [betAmount, setBetAmount] = useState<ChipValue>(
    (CHIP_VALUES.find((v) => v === defaultBet) ?? 100) as ChipValue,
  )
  const [myBets, setMyBets] = useState<Bets>(ZERO_BETS)
  const [lastBets, setLastBets] = useState<Bets>(ZERO_BETS)
  const [pots, setPots] = useState<Pots>(ZERO_POTS)
  const [dice, setDice] = useState<JhandiSymbol[] | null>(null)
  const [diePositions, setDiePositions] = useState<DieOnTable[]>([])
  const [counts, setCounts] = useState<Record<JhandiSymbol, number> | null>(null)
  const [winningSymbol, setWinningSymbol] = useState<JhandiSymbol | null>(null)
  const [winMult, setWinMult] = useState(0)
  const [payout, setPayout] = useState(0)
  const [history, setHistory] = useState<Record<JhandiSymbol, number>[]>([])
  const [bots, setBots] = useState<SimPlayer[]>(makeBots)
  const [flying, setFlying] = useState<FlyingChip[]>([])
  const [banner, setBanner] = useState<'place' | 'stop' | null>('place')
  const [activeBot, setActiveBot] = useState<string | null>(null)
  const [round, setRound] = useState(1)

  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const myBetsRef = useRef(myBets)
  myBetsRef.current = myBets
  const pendingDiceRef = useRef<JhandiSymbol[] | null>(null)

  const playSnd = useCallback((key: keyof typeof SND) => {
    try {
      const a = new Audio(SND[key])
      a.volume = 0.45
      void a.play().catch(() => {})
    } catch {
      /* ignore */
    }
  }, [])

  const addFlying = useCallback((chip: Omit<FlyingChip, 'id'>) => {
    const id = nextFxId()
    setFlying((prev) => [...prev.slice(-28), { ...chip, id }])
    window.setTimeout(() => setFlying((prev) => prev.filter((c) => c.id !== id)), 700 + chip.delay)
  }, [])

  const botBet = useCallback(
    (botId: number, symbol: JhandiSymbol, amount: number, fromX: number, fromY: number, toX: number, toY: number) => {
      if (phaseRef.current !== 'betting') return
      const value = chipFor(amount)
      setPots((p) => ({ ...p, [symbol]: p[symbol] + amount }))
      setBots((bs) =>
        bs.map((b, i) =>
          i === botId ? { ...b, total: b.total + amount, lastSymbol: symbol, lastAmount: amount } : b,
        ),
      )
      setActiveBot(`bot-${botId}`)
      window.setTimeout(() => setActiveBot(null), 400)
      addFlying({
        value,
        fx: fromX,
        fy: fromY,
        tx: toX + (Math.random() - 0.5) * 40,
        ty: toY + (Math.random() - 0.5) * 30,
        delay: 0,
      })
      sound.play('chip', { volume: 0.25 })
    },
    [addFlying],
  )

  // Simulated bot betting during open round
  useEffect(() => {
    if (phase !== 'betting') return
    const timers: ReturnType<typeof setTimeout>[] = []
    const schedule = () => {
      const delay = 400 + Math.random() * 1200
      const t = window.setTimeout(() => {
        if (phaseRef.current !== 'betting') return
        const botIdx = Math.floor(Math.random() * bots.length)
        const symbol = SYMBOL_ORDER[Math.floor(Math.random() * SYMBOL_ORDER.length)]
        const amounts = [10, 20, 50, 100, 200, 500]
        const amount = amounts[Math.floor(Math.random() * amounts.length)]
        const feltX = 80 + Math.random() * 230
        const feltY = 420 + Math.random() * 180
        const zoneIdx = SYMBOL_ORDER.indexOf(symbol)
        const col = zoneIdx % 3
        const row = Math.floor(zoneIdx / 3)
        const tx = 48 + col * 108 + Math.random() * 30
        const ty = 410 + row * 140 + Math.random() * 30
        botBet(botIdx, symbol, amount, feltX, feltY, tx, ty)
        schedule()
      }, delay)
      timers.push(t)
    }
    schedule()
    return () => timers.forEach((t) => clearTimeout(t))
  }, [phase, bots.length, botBet])

  // Countdown timer
  useEffect(() => {
    if (phase !== 'betting') return
    if (countdown <= 0) {
      setPhase('closed')
      setBanner('stop')
      playSnd('stopBetting')
      window.setTimeout(() => {
        setBanner(null)
        setPhase('shaking')
        playSnd('roll')
        window.setTimeout(() => {
          const rolled = pendingDiceRef.current ?? rollJhandiDice()
          pendingDiceRef.current = rolled
          setDice(rolled)
          setCounts(jhandiCounts(rolled))
          setPhase('rolling')
          const colW = DICE_LAND.width / DICE_LAND.cols
          const rowH = DICE_LAND.height / DICE_LAND.rows
          const positions: DieOnTable[] = rolled.map((sym, i) => ({
            id: `die-${i}`,
            symbol: sym,
            x:
              DICE_LAND.left +
              (i % DICE_LAND.cols) * colW +
              colW * 0.5 -
              20 +
              Math.random() * 12,
            y:
              DICE_LAND.top +
              Math.floor(i / DICE_LAND.cols) * rowH +
              rowH * 0.5 -
              20 +
              Math.random() * 10,
            rot: Math.random() * 360,
            delay: i * 80,
            settled: false,
          }))
          setDiePositions(positions)
          window.setTimeout(() => {
            setDiePositions((d) => d.map((x) => ({ ...x, settled: true })))
            setPhase('result')
            const totalPayout = jhandiTotalPayout(myBetsRef.current, rolled)
            setPayout(totalPayout)
            const myStake = Object.values(myBetsRef.current).reduce((a, b) => a + b, 0)
            setLastBets({ ...myBetsRef.current })
            if (totalPayout > 0) {
              wallet.credit(totalPayout)
              wallet.holdWin?.(totalPayout)
              sound.play('win')
              const best = SYMBOL_ORDER.reduce<{ sym: JhandiSymbol; mult: number } | null>((acc, sym) => {
                const stake = myBetsRef.current[sym]
                if (stake <= 0) return acc
                const c = rolled.filter((d) => d === sym).length
                const mult = c > 0 ? c + 1 : 0
                if (mult > 0 && (!acc || mult > acc.mult)) return { sym, mult }
                return acc
              }, null)
              if (best) {
                setWinningSymbol(best.sym)
                setWinMult(best.mult)
              }
            } else if (myStake > 0) {
              sound.play('lose', { volume: 0.5 })
              onMessage?.(roundLossMessage(myStake))
            }
            window.setTimeout(() => {
              wallet.releaseWinHold?.()
              setPhase('payout')
              window.setTimeout(() => {
                setHistory((h) => [jhandiCounts(rolled), ...h].slice(0, 8))
                setPhase('reset')
                window.setTimeout(() => {
                  setMyBets(ZERO_BETS())
                  setPots(ZERO_POTS())
                  setDice(null)
                  setDiePositions([])
                  setCounts(null)
                  setWinningSymbol(null)
                  setWinMult(0)
                  setPayout(0)
                  setBots(makeBots())
                  setCountdown(ROUND_SEC)
                  pendingDiceRef.current = rollJhandiDice()
                  setRound((r) => r + 1)
                  setBanner('place')
                  playSnd('startBetting')
                  window.setTimeout(() => setBanner(null), 1400)
                  setPhase('betting')
                }, 800)
              }, 1200)
            }, 1800)
          }, 2200)
        }, 1600)
      }, 700)
      return
    }
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, countdown, playSnd, wallet])

  // Pre-roll dice at round start
  useEffect(() => {
    pendingDiceRef.current = rollJhandiDice()
  }, [round])

  const placeBet = useCallback(
    (symbol: JhandiSymbol, amount: number, fromX?: number, fromY?: number, toX?: number, toY?: number) => {
      if (phase !== 'betting') return false
      if (!wallet.canAfford(amount) || !wallet.debit(amount)) return false
      setMyBets((b) => ({ ...b, [symbol]: b[symbol] + amount }))
      setPots((p) => ({ ...p, [symbol]: p[symbol] + amount }))
      sound.play('chip')
      sound.vibrate(10)
      if (fromX != null && toX != null) {
        addFlying({
          value: chipFor(amount),
          fx: fromX,
          fy: fromY ?? 380,
          tx: toX,
          ty: toY ?? 200,
          delay: 0,
        })
      }
      return true
    },
    [phase, wallet, addFlying],
  )

  const rebet = useCallback(() => {
    if (phase !== 'betting') return
    const total = Object.values(lastBets).reduce((a, b) => a + b, 0)
    if (total <= 0 || !wallet.canAfford(total)) return
    for (const sym of SYMBOL_ORDER) {
      if (lastBets[sym] > 0) placeBet(sym, lastBets[sym])
    }
  }, [phase, lastBets, wallet, placeBet])

  const clearBets = useCallback(() => {
    if (phase !== 'betting') return
    const refund = Object.values(myBets).reduce((a, b) => a + b, 0)
    if (refund > 0) wallet.credit(refund)
    setMyBets(ZERO_BETS())
    setPots((p) => {
      const mine = myBetsRef.current
      const next = { ...p }
      for (const sym of SYMBOL_ORDER) next[sym] = Math.max(0, p[sym] - mine[sym])
      return next
    })
  }, [phase, myBets, wallet])

  const myStake = Object.values(myBets).reduce((a, b) => a + b, 0)

  return {
    phase,
    countdown,
    betAmount,
    setBetAmount,
    myBets,
    lastBets,
    pots,
    dice,
    diePositions,
    counts,
    winningSymbol,
    winMult,
    payout,
    history,
    bots,
    flying,
    banner,
    activeBot,
    round,
    myStake,
    placeBet,
    rebet,
    clearBets,
    addFlying,
    canBet: phase === 'betting',
    canRebet: phase === 'betting' && Object.values(lastBets).reduce((a, b) => a + b, 0) > 0,
  }
}
