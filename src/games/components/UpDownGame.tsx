import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import { sound } from '../../lib/sound'
import { getAccess } from '../../api/client'
import { type UpDownChoice } from '../engines/dice'
import { connectSevenUpSocket } from '../lib/sevenUpSocket'
import type { GameComponentProps } from '../types'
import { useDesignScale } from '../hooks/useDesignScale'
import UpDownDesignUI, {
  type AiPlayer,
  type FlyingChip,
  type TableChip,
  type WinFloat,
} from './UpDownDesignUI'
import { chipColorForValue } from './upDownChips'
import { zoneForSum } from './upDownClassicGfx'
import styles from './premiumFrame.module.css'
import AddCashModal from '../../components/s9/modals/AddCashModal'

const ROUND_SEC = 12

const AI_PLAYERS: Omit<AiPlayer, 'avatar'>[] = [
  { id: 'emmett', name: 'Emmett', balance: 72589, badge: 'WINNER', side: 'left' },
  { id: 'p22416', name: 'P22416', balance: 1900, side: 'left' },
  { id: 'gaoushik', name: 'Gaoushik Z', balance: 1521, side: 'left' },
  { id: 'p25254', name: 'P25254', balance: 12473, badge: 'LUCKY', side: 'right' },
  { id: 'g25280', name: 'G25280', balance: 1687, side: 'right' },
  { id: 'anand', name: 'Anand', balance: 5429, side: 'right' },
]

const PLAYER_NAME = 'P9751521'
const PLAYER_AVATAR = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(PLAYER_NAME)}&size=96`

function avatarFor(id: string) {
  return `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(id)}&size=96`
}

const INITIAL_HISTORY = [10, 7, 8, 7, 3, 10, 6, 8, 5, 12, 2, 9, 4, 11, 6]
const INITIAL_ZONE_TOTALS: Record<UpDownChoice, number> = { down: 6170, seven: 690, up: 6670 }
const CHIP_VALUES = [10, 50, 100, 500, 1000, 2000, 5000, 10000] as const

let chipIdSeq = 0
function nextChipId() {
  chipIdSeq += 1
  return `chip-${chipIdSeq}-${Date.now()}`
}

function randomChipValue(): number {
  const weights = [0.35, 0.3, 0.2, 0.1, 0.05]
  const r = Math.random()
  let acc = 0
  for (let i = 0; i < CHIP_VALUES.length; i++) {
    acc += weights[i]!
    if (r < acc) return CHIP_VALUES[i]!
  }
  return 10
}

function randomZone(): UpDownChoice {
  const r = Math.random()
  if (r < 0.42) return 'down'
  if (r < 0.52) return 'seven'
  return 'up'
}

function pilePosition(zone: UpDownChoice): { x: number; y: number; rot: number } {
  const cx = zone === 'seven' ? 48 + Math.random() * 8 : 28 + Math.random() * 44
  const cy = 48 + Math.random() * 38
  return { x: cx, y: cy, rot: -35 + Math.random() * 70 }
}

function makeChip(zone: UpDownChoice, value: number): TableChip {
  const pos = pilePosition(zone)
  return {
    id: nextChipId(),
    value,
    color: chipColorForValue(value),
    x: pos.x,
    y: pos.y,
    rot: pos.rot,
    zone,
  }
}

function seedChipsForZone(zone: UpDownChoice, count: number): TableChip[] {
  return Array.from({ length: count }, () => makeChip(zone, randomChipValue()))
}

type MyBets = Record<UpDownChoice, number>

function uiPhaseFromServer(p: string | undefined): 'betting' | 'rolling' | 'result' {
  if (p === 'reveal') return 'result'
  if (p === 'locked') return 'rolling'
  return 'betting'
}

export default function UpDownGame({ bet: defaultBet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef)
  const { balance, canAfford, refresh } = useWallet()
  const live = !!getAccess()

  const [betAmount, setBetAmount] = useState(defaultBet >= 10 ? defaultBet : 100)
  const [phase, setPhase] = useState<'betting' | 'rolling' | 'result'>('betting')
  const [countdown, setCountdown] = useState(ROUND_SEC)
  const [history, setHistory] = useState(INITIAL_HISTORY)
  const [zoneTotals, setZoneTotals] = useState(INITIAL_ZONE_TOTALS)
  const [tableChips, setTableChips] = useState<TableChip[]>([])
  const [flyingChips, setFlyingChips] = useState<FlyingChip[]>([])
  const [winFloats, setWinFloats] = useState<WinFloat[]>([])
  const [myBets, setMyBets] = useState<MyBets>({ down: 0, seven: 0, up: 0 })
  const [lastBets, setLastBets] = useState<MyBets>({ down: 0, seven: 0, up: 0 })
  const [lastResult, setLastResult] = useState<{ sum: number; won: boolean; win: number } | null>(null)
  const [winningZone, setWinningZone] = useState<UpDownChoice | null>(null)
  const [aiBalances, setAiBalances] = useState(() =>
    Object.fromEntries(AI_PLAYERS.map((p) => [p.id, p.balance])),
  )
  const [showAddCash, setShowAddCash] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const seatRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const zoneRefs = useRef<Record<UpDownChoice, HTMLDivElement | null>>({
    down: null,
    seven: null,
    up: null,
  })
  const selfRef = useRef<HTMLDivElement | null>(null)
  const pendingLands = useRef<Map<string, { zone: UpDownChoice; value: number }>>(new Map())
  const lastPeriodRef = useRef<string | null>(null)
  const revealedPeriodRef = useRef<string | null>(null)
  const myBetsRef = useRef(myBets)
  myBetsRef.current = myBets
  const socketRef = useRef<ReturnType<typeof connectSevenUpSocket> | null>(null)

  const registerSeatRef = useCallback((playerId: string, el: HTMLDivElement | null) => {
    seatRefs.current[playerId] = el
  }, [])

  const registerZoneRef = useCallback((zone: UpDownChoice, el: HTMLDivElement | null) => {
    zoneRefs.current[zone] = el
  }, [])

  const registerSelfRef = useCallback((el: HTMLDivElement | null) => {
    selfRef.current = el
  }, [])

  const getCoords = useCallback((fromEl: HTMLElement | null, toEl: HTMLElement | null, container: HTMLElement | null) => {
    if (!fromEl || !toEl || !container) return null
    const cRect = container.getBoundingClientRect()
    const fRect = fromEl.getBoundingClientRect()
    const tRect = toEl.getBoundingClientRect()
    return {
      fromX: fRect.left + fRect.width / 2 - cRect.left,
      fromY: fRect.top + fRect.height / 2 - cRect.top,
      toX: tRect.left + tRect.width / 2 - cRect.left + (Math.random() - 0.5) * 40,
      toY: tRect.top + tRect.height / 2 - cRect.top + (Math.random() - 0.5) * 20,
    }
  }, [])

  const addTableChip = useCallback((zone: UpDownChoice, value: number) => {
    const chip = makeChip(zone, value)
    setTableChips((prev) => [...prev.slice(-80), chip])
    setZoneTotals((prev) => ({ ...prev, [zone]: prev[zone] + value }))
  }, [])

  const launchChip = useCallback(
    (fromId: string, zone: UpDownChoice, value: number, isSelf = false) => {
      const container = viewportRef.current?.querySelector('[data-updown-play-area]') as HTMLElement | null
      const fromEl = isSelf ? selfRef.current : seatRefs.current[fromId]
      const toEl = zoneRefs.current[zone]
      const coords = getCoords(fromEl, toEl, container)
      if (!coords) {
        addTableChip(zone, value)
        return
      }

      const id = nextChipId()
      pendingLands.current.set(id, { zone, value })
      setFlyingChips((prev) => [
        ...prev,
        {
          id,
          value,
          color: chipColorForValue(value),
          fromX: coords.fromX,
          fromY: coords.fromY,
          toX: coords.toX,
          toY: coords.toY,
          delay: Math.random() * 80,
        },
      ])

      window.setTimeout(() => {
        const pending = pendingLands.current.get(id)
        if (pending) {
          addTableChip(pending.zone, pending.value)
          pendingLands.current.delete(id)
        }
        setFlyingChips((prev) => prev.filter((c) => c.id !== id))
      }, 600)
    },
    [addTableChip, getCoords],
  )

  const showResultFx = useCallback(
    (sum: number, totalWin: number) => {
      const won = totalWin > 0
      if (won) {
        sound.play('win')
        onMessage?.(`Won ${totalWin.toLocaleString()} chips!`)
        const floatId = nextChipId()
        setWinFloats((prev) => [
          ...prev,
          { id: floatId, text: `+${totalWin.toLocaleString()}`, x: 380, y: 180 },
        ])
        window.setTimeout(() => {
          setWinFloats((prev) => prev.filter((f) => f.id !== floatId))
        }, 1300)
      } else {
        sound.play('lose', { volume: 0.5 })
        onMessage?.(`Sum ${sum} — try again`)
      }
    },
    [onMessage],
  )

  const placeBet = useCallback(
    (zone: UpDownChoice, amount: number, fromId: string, isSelf: boolean) => {
      if (phase !== 'betting') return false
      if (isSelf) {
        if (!canAfford(amount)) {
          sound.play('error')
          onMessage?.('Insufficient balance')
          return false
        }
        if (live) {
          const sock = socketRef.current
          if (!sock) {
            sound.play('error')
            onMessage?.('Not connected')
            return false
          }
          void sock
            .request('bet', { side: zone, amount })
            .then(() => {
              sound.play('chip')
              setMyBets((prev) => ({ ...prev, [zone]: prev[zone] + amount }))
              launchChip(fromId, zone, amount, true)
              void refresh()
            })
            .catch((e: any) => {
              sound.play('error')
              onMessage?.(e?.message || 'Bet failed')
            })
          return true
        }
        sound.play('error')
        onMessage?.('Not authenticated')
        return false
      } else {
        setAiBalances((prev) => ({
          ...prev,
          [fromId]: Math.max(0, (prev[fromId] ?? 0) - amount),
        }))
      }
      launchChip(fromId, zone, amount, isSelf)
      return true
    },
    [canAfford, launchChip, live, onMessage, phase, refresh],
  )

  const handleZoneBet = useCallback(
    (zone: UpDownChoice) => {
      placeBet(zone, betAmount, PLAYER_NAME, true)
    },
    [betAmount, placeBet],
  )

  const handleRebet = useCallback(() => {
    if (phase !== 'betting') return
    const total = lastBets.down + lastBets.seven + lastBets.up
    if (total === 0) return
    if (!canAfford(total)) {
      onMessage?.('Insufficient balance for ReBet')
      return
    }
    ;(['down', 'seven', 'up'] as UpDownChoice[]).forEach((z) => {
      if (lastBets[z] > 0) placeBet(z, lastBets[z], PLAYER_NAME, true)
    })
  }, [canAfford, lastBets, onMessage, phase, placeBet])

  // Live: server WS drives phase / dice / payouts
  useEffect(() => {
    if (!live) {
      onMessage?.('Not authenticated')
      return
    }
    const sock = connectSevenUpSocket({
      onState: (state) => {
        const nextUi = uiPhaseFromServer(state.phase)
        const period = String(state.period ?? state.roundId ?? '')
        setCountdown(Math.max(0, Math.ceil((Number(state.msLeft) || 0) / 1000)))

        if (Array.isArray(state.history) && state.history.length) {
          setHistory(state.history.slice(0, 15))
        }
        if (state.zoneTotals) {
          setZoneTotals({
            down: Number(state.zoneTotals.down) || 0,
            seven: Number(state.zoneTotals.seven) || 0,
            up: Number(state.zoneTotals.up) || 0,
          })
        }
        if (state.myBets) {
          setMyBets({
            down: Number(state.myBets.down) || 0,
            seven: Number(state.myBets.seven) || 0,
            up: Number(state.myBets.up) || 0,
          })
        }

        if (nextUi === 'betting') {
          if (lastPeriodRef.current && lastPeriodRef.current !== period) {
            setTableChips([
              ...seedChipsForZone('down', 8),
              ...seedChipsForZone('seven', 3),
              ...seedChipsForZone('up', 8),
            ])
            setLastResult(null)
            setWinningZone(null)
          }
          lastPeriodRef.current = period
          setPhase('betting')
          return
        }

        if (nextUi === 'rolling') {
          setPhase('rolling')
          return
        }

        const sum = Number(state.sum)
        if (!Number.isFinite(sum)) {
          setPhase('rolling')
          return
        }
        const winZone = (state.winningZone as UpDownChoice) || zoneForSum(sum)
        const totalWin = Number(state.myPayout ?? 0)
        setWinningZone(winZone)
        setLastResult({ sum, won: totalWin > 0, win: totalWin })
        setPhase('result')
        setLastBets({
          down: Number(state.myBets?.down) || 0,
          seven: Number(state.myBets?.seven) || 0,
          up: Number(state.myBets?.up) || 0,
        })
        if (revealedPeriodRef.current !== period) {
          revealedPeriodRef.current = period
          showResultFx(sum, totalWin)
          void refresh()
        }
        lastPeriodRef.current = period
      },
      onError: (message) => onMessage?.(message),
    })
    socketRef.current = sock
    return () => {
      sock.close()
      socketRef.current = null
    }
  }, [live, onMessage, refresh, showResultFx])

  // Demo clock removed — RequireAuth on /play
  useEffect(() => {
    if (!live) onMessage?.('Not authenticated')
  }, [live, onMessage])

  useEffect(() => {
    if (phase !== 'betting') return
    const aiTick = window.setInterval(() => {
      const player = AI_PLAYERS[Math.floor(Math.random() * AI_PLAYERS.length)]!
      const zone = randomZone()
      const value = randomChipValue()
      if ((aiBalances[player.id] ?? 0) >= value) {
        placeBet(zone, value, player.id, false)
      }
    }, 900 + Math.random() * 800)
    return () => window.clearInterval(aiTick)
  }, [aiBalances, phase, placeBet])

  useEffect(() => {
    if (tableChips.length > 0) return
    setTableChips([
      ...seedChipsForZone('down', 10),
      ...seedChipsForZone('seven', 4),
      ...seedChipsForZone('up', 10),
    ])
  }, [tableChips.length])

  const aiPlayersWithBalance: AiPlayer[] = AI_PLAYERS.map((p) => ({
    ...p,
    balance: aiBalances[p.id] ?? p.balance,
    avatar: avatarFor(p.id),
  }))

  return (
    <>
    <UpDownDesignUI
      viewportRef={viewportRef}
      layout={layout}
      rootClassName={styles.root}
      canvasClassName={styles.canvas}
      balance={balance}
      playerName={PLAYER_NAME}
      playerAvatar={PLAYER_AVATAR}
      betAmount={betAmount}
      phase={phase}
      countdown={countdown}
      roundSec={ROUND_SEC}
      history={history}
      zoneTotals={zoneTotals}
      tableChips={tableChips}
      flyingChips={flyingChips}
      winFloats={winFloats}
      aiPlayers={aiPlayersWithBalance}
      lastResult={lastResult}
      winningZone={winningZone}
      onBetAmount={setBetAmount}
      onZoneBet={handleZoneBet}
      onRebet={handleRebet}
      onHome={() => navigate('/home')}
      onAddCash={() => {
        setMenuOpen(false)
        setShowAddCash(true)
      }}
      menuOpen={menuOpen}
      onToggleMenu={() => setMenuOpen((v) => !v)}
      registerSeatRef={registerSeatRef}
      registerZoneRef={registerZoneRef}
      registerSelfRef={registerSelfRef}
    />
    {showAddCash && <AddCashModal onClose={() => setShowAddCash(false)} />}
    </>
  )
}
