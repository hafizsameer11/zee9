import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { sound } from '../../lib/sound'
import {
  CHIP_DENOMS,
  preloadCasinoAssets,
  type ChipDenom,
  type PlacedChip,
  type RoundPhase,
  type WlBetKey,
} from '../engines/wingoLottery'
import { useDesignScale } from '../hooks/useDesignScale'
import { useGameLeaveGuard } from '../hooks/useGameLeaveGuard'
import { roundLossMessage, roundWinMessage } from '../lib/roundResult'
import {
  connectLotterySocket,
  type LotteryPublicBetEvent,
  type LotterySocketState,
} from '../lib/wingoLotterySocket'
import type { GameComponentProps } from '../types'
import WingoLotteryDesignUI from './WingoLotteryDesignUI'

export const WL_DESIGN_W = 850
export const WL_DESIGN_H = 480

type LotteryBet = LotterySocketState['myBets'][number]

function keyToApi(key: WlBetKey): { type: 'number' | 'green' | 'red' | 'violet'; value?: number } {
  if (key.startsWith('color:')) {
    return { type: key.slice(6) as 'green' | 'red' | 'violet' }
  }
  return { type: 'number', value: Number(key.slice(4)) }
}

function nearestDenom(amount: number): ChipDenom {
  let best: ChipDenom = CHIP_DENOMS[0]!
  let bestDiff = Math.abs(amount - best)
  for (const d of CHIP_DENOMS) {
    const diff = Math.abs(amount - d)
    if (diff < bestDiff) {
      best = d
      bestDiff = diff
    }
  }
  return best
}

/** Visual holds during REVEAL (~9s server window). */
const VISUAL: { phase: RoundPhase; ms: number }[] = [
  { phase: 'STOP_BETTING', ms: 1200 },
  { phase: 'MACHINE_ENTERING', ms: 700 },
  { phase: 'BALLS_MIXING', ms: 4200 },
  { phase: 'BALL_SELECTED', ms: 800 },
  { phase: 'RESULT_REVEAL', ms: 1100 },
  { phase: 'RESULT_TO_HISTORY', ms: 700 },
  { phase: 'SETTLEMENT', ms: 900 },
]

export default function WingoLotteryGame({ onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef, WL_DESIGN_W, WL_DESIGN_H)
  const { balance, canAfford, refresh } = useWallet()

  const [selectedChip, setSelectedChip] = useState<ChipDenom>(10)
  const [chips, setChips] = useState<PlacedChip[]>([])
  const [lastRoundKeys, setLastRoundKeys] = useState<WlBetKey[]>([])
  const [history, setHistory] = useState<number[]>([])
  const [lastWin, setLastWin] = useState(0)
  const [assetsReady, setAssetsReady] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [server, setServer] = useState<LotterySocketState | null>(null)
  const [phase, setPhase] = useState<RoundPhase>('BETTING_OPEN')
  const [result, setResult] = useState<number | null>(null)
  const [livePublicBets, setLivePublicBets] = useState<
    Array<{ id: string; betKey: WlBetKey; amount: number }>
  >([])
  const [cellTotals, setCellTotals] = useState<Record<string, number>>({})
  const [playersOnline, setPlayersOnline] = useState(1)

  const socketRef = useRef<ReturnType<typeof connectLotterySocket> | null>(null)
  const betQueueRef = useRef<Promise<void>>(Promise.resolve())
  const pendingSpendRef = useRef(0)
  const optimisticSeq = useRef(0)
  const walletRefreshTimer = useRef<number | null>(null)
  const visualRunning = useRef(false)
  const lastServerPhase = useRef<string>('')
  const lastStateSignature = useRef('')
  const lastHistorySignature = useRef('')
  const lastCellSignature = useRef('')
  const lastMineSignature = useRef('')
  const settledPeriod = useRef<string>('')
  const seenPublic = useRef(new Set<string>())
  const periodRef = useRef('')

  useEffect(() => {
    let cancelled = false
    void preloadCasinoAssets((loaded, total) => {
      if (cancelled || total <= 0) return
      setLoadProgress(Math.round((loaded / total) * 100))
    }).then(() => {
      if (!cancelled) {
        setLoadProgress(100)
        setAssetsReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void sound.unlock()
    void sound.preload([
      'chip',
      'click',
      'win',
      'lose',
      'whoosh',
      'tap',
      'spin',
      'tick',
      'reveal',
      'notify',
      'open',
      'coin',
      'bonus',
      'error',
    ])
  }, [])

  const runVisualReveal = useCallback(
    (
      n: number,
      period: string,
      outcome?: { won: number; hadBets: boolean; staked: number },
    ) => {
    if (visualRunning.current) return
    visualRunning.current = true
    setResult(n)
    let delay = 0
    const timers: number[] = []
    for (const step of VISUAL) {
      const at = delay
      timers.push(
        window.setTimeout(() => {
          setPhase(step.phase)
          if (step.phase === 'RESULT_REVEAL' && outcome) {
            if (outcome.won > 0) {
              setLastWin(outcome.won)
              sound.play('win', { volume: 0.75 })
              onMessage?.(roundWinMessage(outcome.won))
              window.setTimeout(() => onMessage?.(null), 2200)
            } else if (outcome.hadBets && outcome.staked > 0) {
              sound.play('lose', { volume: 0.3 })
              onMessage?.(roundLossMessage(outcome.staked))
              window.setTimeout(() => onMessage?.(null), 2200)
            }
            sound.play('reveal', { volume: 0.5 })
          }
          if (step.phase === 'RESULT_TO_HISTORY') {
            setHistory((h) => {
              if (h[h.length - 1] === n) return h
              return [...h.slice(-20), n]
            })
          }
          if (step.phase === 'SETTLEMENT' && settledPeriod.current !== period) {
            settledPeriod.current = period
            void refresh()
          }
        }, at),
      )
      delay += step.ms
    }
    timers.push(
      window.setTimeout(() => {
        visualRunning.current = false
        setPhase('BETTING_OPEN')
        setResult(null)
        setChips([])
        setLastWin(0)
        seenPublic.current.clear()
        setLivePublicBets([])
      }, delay + 200),
    )
    return () => {
      for (const t of timers) window.clearTimeout(t)
      visualRunning.current = false
    }
  },
    [onMessage, refresh],
  )

  useEffect(() => {
    if (!assetsReady) return
    const sock = connectLotterySocket({
      onState: (st: LotterySocketState) => {
        // The server pushes every 250ms. Only repaint when a displayed value
        // actually changes (countdown second, bets, phase, result, presence).
        const signature = [
          st.period,
          st.phase,
          Math.ceil((st.msLeft || 0) / 1000),
          st.result ?? '',
          st.playersOnline ?? '',
          (st.myBets || [])
            .map((b: LotterySocketState['myBets'][number]) => `${b.id}:${b.state}:${b.payout}`)
            .join(','),
          (st.publicBets || [])
            .map((b: LotterySocketState['publicBets'][number]) => b.id)
            .join(','),
          Object.entries(st.cellTotals || {}).sort().map(([k, v]) => `${k}:${v}`).join(','),
        ].join('|')
        if (signature === lastStateSignature.current) return
        lastStateSignature.current = signature

        setServer(st)
        const historySignature = (st.history || []).join(',')
        if (
          st.history?.length &&
          historySignature !== lastHistorySignature.current &&
          !visualRunning.current
        ) {
          lastHistorySignature.current = historySignature
          setHistory(st.history)
        }
        const cellSignature = Object.entries(st.cellTotals || {})
          .sort()
          .map(([k, v]) => `${k}:${v}`)
          .join(',')
        if (st.cellTotals && cellSignature !== lastCellSignature.current) {
          lastCellSignature.current = cellSignature
          setCellTotals(st.cellTotals)
        }
        if (st.playersOnline != null) setPlayersOnline(Math.max(1, st.playersOnline))

        // Sync own ACTIVE bets onto table chips
        const mine: PlacedChip[] = (st.myBets || [])
          .filter((b: LotteryBet) => b.state === 'ACTIVE')
          .map((b: LotteryBet) => ({
            id: b.id,
            denom: nearestDenom(b.amount),
            betKey: b.betKey as WlBetKey,
            x: 18 + Math.random() * 55,
            y: 15 + Math.random() * 50,
            rot: -25 + Math.random() * 50,
            owner: 'me' as const,
          }))
        // Only replace my chips during betting (preserve positions lightly)
        const mineSignature = mine.map((m) => m.id).join(',')
        if (
          st.phase === 'betting' &&
          !visualRunning.current &&
          mineSignature !== lastMineSignature.current
        ) {
          lastMineSignature.current = mineSignature
          setChips((prev) => {
            const bots = prev.filter((c) => c.owner === 'bot')
            const pending = prev.filter(
              (c) => c.owner === 'me' && c.id.startsWith('optimistic-'),
            )
            const byId = new Map(prev.filter((c) => c.owner === 'me').map((c) => [c.id, c]))
            const nextMine = mine.map((m) => byId.get(m.id) ?? m)
            return [...bots, ...nextMine, ...pending].slice(-120)
          })
        }

        // Queue new public bets for fly-in (from state snapshot)
        const fresh: Array<{ id: string; betKey: WlBetKey; amount: number }> = []
        for (const b of st.publicBets || []) {
          if (seenPublic.current.has(b.id)) continue
          seenPublic.current.add(b.id)
          fresh.push({ id: b.id, betKey: b.betKey as WlBetKey, amount: b.amount })
        }
        if (fresh.length) setLivePublicBets((q) => [...q, ...fresh])

        // New round while idle
        if (st.period !== periodRef.current) {
          periodRef.current = st.period
          if (st.phase === 'betting' && !visualRunning.current) {
            setPhase('BETTING_OPEN')
            setResult(null)
            setLastWin(0)
            setCellTotals({})
            setChips([])
            setLivePublicBets([])
            seenPublic.current.clear()
          }
        }

        const prev = lastServerPhase.current
        lastServerPhase.current = st.phase

        if (st.phase === 'betting' && !visualRunning.current) {
          setPhase('BETTING_OPEN')
        }

        if (st.phase === 'locked' && prev !== 'locked' && !visualRunning.current) {
          setPhase('STOP_BETTING')
          sound.play('notify', { volume: 0.35 })
        }

        if (st.phase === 'reveal' && st.result != null && prev !== 'reveal') {
          const won = (st.myBets || [])
            .filter((b: LotteryBet) => b.state === 'CASHED_OUT')
            .reduce((s: number, b: LotteryBet) => s + (b.payout || 0), 0)
          const hadBets = (st.myBets || []).some(
            (b: LotteryBet) => b.state === 'CASHED_OUT' || b.state === 'BUST',
          )
          const staked = (st.myBets || [])
            .filter((b: LotteryBet) => b.state === 'CASHED_OUT' || b.state === 'BUST')
            .reduce((s: number, b: LotteryBet) => s + (Number(b.amount) || 0), 0)
          const keys = (st.myBets || []).map((b: LotteryBet) => b.betKey as WlBetKey)
          if (keys.length) setLastRoundKeys(keys)
          runVisualReveal(st.result, st.period, { won, hadBets, staked })
        }
      },
      onBet: (bet: LotteryPublicBetEvent) => {
        if (seenPublic.current.has(bet.id)) return
        seenPublic.current.add(bet.id)
        setLivePublicBets((q) => [
          ...q,
          { id: bet.id, betKey: bet.betKey as WlBetKey, amount: bet.amount },
        ])
        if (bet.playersOnline != null) setPlayersOnline(Math.max(1, bet.playersOnline))
        // Optimistic cell total bump until next full state
        setCellTotals((t) => ({
          ...t,
          [bet.betKey]: (t[bet.betKey] ?? 0) + bet.amount,
        }))
      },
      onPresence: (n: number) => setPlayersOnline(Math.max(1, n)),
      onError: (msg: string) => onMessage?.(msg),
    })
    socketRef.current = sock
    return () => {
      if (walletRefreshTimer.current != null) {
        window.clearTimeout(walletRefreshTimer.current)
        walletRefreshTimer.current = null
      }
      sock.close()
      socketRef.current = null
    }
  }, [assetsReady, onMessage, runVisualReveal])

  const bettingOpen = !!server?.canBet && phase === 'BETTING_OPEN' && !visualRunning.current
  const seconds = server?.phase === 'betting' ? Math.max(0, Math.ceil((server.msLeft || 0) / 1000)) : 0

  const playerId = useMemo(() => `P${String(9750000 + Math.floor(balance % 9000))}`, [balance])

  const placeChip = useCallback(
    (key: WlBetKey) => {
      if (!bettingOpen) return
      const amount = selectedChip
      if (!canAfford(pendingSpendRef.current + amount)) {
        sound.play('error')
        onMessage?.('Insufficient balance')
        return
      }

      const optimisticId = `optimistic-${Date.now()}-${++optimisticSeq.current}`
      pendingSpendRef.current += amount
      setChips((list) => [
        ...list.slice(-119),
        {
          id: optimisticId,
          denom: amount,
          betKey: key,
          x: 12 + Math.random() * 68,
          y: 10 + Math.random() * 58,
          rot: -35 + Math.random() * 70,
          owner: 'me',
        },
      ])
      setCellTotals((t) => ({ ...t, [key]: (t[key] ?? 0) + amount }))
      sound.play('chip', { volume: 0.4 })

      betQueueRef.current = betQueueRef.current.then(async () => {
        try {
          const sock = socketRef.current
          if (!sock) throw new Error('Not connected')
          const body = keyToApi(key)
          const placed = await sock.request<{ betId: string }>('bet', {
            type: body.type,
            value: body.value ?? null,
            amount,
          })
          setChips((list) =>
            list.map((chip) =>
              chip.id === optimisticId ? { ...chip, id: placed.betId } : chip,
            ),
          )
        } catch (e: any) {
          setChips((list) => list.filter((chip) => chip.id !== optimisticId))
          setCellTotals((t) => ({
            ...t,
            [key]: Math.max(0, (t[key] ?? 0) - amount),
          }))
          sound.play('error')
          onMessage?.(e?.message || 'Bet failed')
        } finally {
          pendingSpendRef.current = Math.max(0, pendingSpendRef.current - amount)
          if (walletRefreshTimer.current != null) {
            window.clearTimeout(walletRefreshTimer.current)
          }
          walletRefreshTimer.current = window.setTimeout(() => {
            walletRefreshTimer.current = null
            void refresh()
          }, 250)
        }
      })
    },
    [bettingOpen, canAfford, onMessage, refresh, selectedChip],
  )

  const addBotChip = useCallback((chip: PlacedChip) => {
    setChips((list) => [...list.slice(-119), chip])
  }, [])

  const onPublicConsumed = useCallback((id: string) => {
    setLivePublicBets((q) => q.filter((b) => b.id !== id))
  }, [])

  const rebet = useCallback(() => {
    if (!bettingOpen || lastRoundKeys.length === 0) return
    const cost = lastRoundKeys.length * selectedChip
    if (!canAfford(pendingSpendRef.current + cost)) {
      sound.play('error')
      onMessage?.('Insufficient balance')
      return
    }
    for (const key of lastRoundKeys) placeChip(key)
  }, [bettingOpen, lastRoundKeys, selectedChip, canAfford, onMessage, placeChip])

  const jumpPhase = useCallback((p: RoundPhase | 'FULL_ROUND' | 'CHIP_BURST') => {
    if (p === 'WIN_CELEBRATION') {
      setLastWin(2580)
      setPhase('WIN_CELEBRATION')
      return
    }
    if (typeof p === 'string' && p !== 'FULL_ROUND' && p !== 'CHIP_BURST') setPhase(p)
  }, [])

  const chipStake = chips.reduce((sum, c) => sum + c.denom, 0)
  const { requestLeave, LeaveModal } = useGameLeaveGuard(navigate, {
    hasActiveBet: chips.length > 0,
    stakeAmount: chipStake,
    lobbyPath: '/',
  })

  return (
    <>
    <WingoLotteryDesignUI
      viewportRef={viewportRef}
      layout={layout}
      balance={balance}
      playerId={playerId}
      selectedChip={selectedChip}
      chips={chips}
      history={history}
      seconds={seconds}
      phase={phase}
      result={result}
      bettingOpen={bettingOpen}
      lastWin={lastWin}
      onHome={requestLeave}
      onSelectChip={(d) => {
        sound.play('tap', { volume: 0.35 })
        setSelectedChip(d)
      }}
      onPlace={(key) => void placeChip(key)}
      onBotChip={addBotChip}
      onRebet={() => void rebet()}
      onPreview={import.meta.env.DEV ? jumpPhase : undefined}
      assetsReady={assetsReady}
      loadProgress={loadProgress}
      livePublicBets={livePublicBets}
      onPublicConsumed={onPublicConsumed}
      cosmeticBots={bettingOpen && playersOnline <= 1}
      cellTotals={cellTotals}
      playersOnline={playersOnline}
    />
    {LeaveModal}
    </>
  )
}
