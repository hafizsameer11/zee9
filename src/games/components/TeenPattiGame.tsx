import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../../context/WalletContext'
import {
  SEAT_META,
  activeCount,
  applyBlind,
  applyChaal,
  applyPack,
  applySee,
  applyShow,
  blindAmount,
  botAction,
  chaalAmount,
  currentSeat,
  finalizeShowdown,
  startGame,
  type TeenPattiState,
} from '../engines/teenPatti'
import { DESIGN_H, DESIGN_W, useDesignScale } from '../hooks/useDesignScale'
import type { GameComponentProps } from '../types'
import TeenPattiDesignUI from './TeenPattiDesignUI'
import styles from './teenPattiGame.module.css'

export default function TeenPattiGame({ bet, onMessage }: GameComponentProps) {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const layout = useDesignScale(viewportRef)
  const { balance, debit, credit, canAfford } = useWallet()

  const [game, setGame] = useState<TeenPattiState | null>(null)
  const [timer, setTimer] = useState(15)
  const botLock = useRef(false)

  const boot = bet
  const isYourTurn = game?.phase === 'playing' && currentSeat(game).id === 'you'
  const youSeat = game?.seats.find((s) => s.id === 'you')
  const canShow = game && isYourTurn && activeCount(game) === 2 && youSeat?.seen

  const beginRound = () => {
    if (!canAfford(boot) || !debit(boot)) {
      onMessage?.('Insufficient balance')
      return
    }
    setGame(startGame(boot))
    setTimer(15)
    onMessage?.(null)
  }

  const endRound = useCallback(
    (state: TeenPattiState) => {
      if (state.winnerId === 'you') {
        credit(state.pot)
        onMessage?.('🎉 You won the pot!')
      } else if (state.winnerId) {
        onMessage?.(`${SEAT_META[state.winnerId].name} wins`)
      }
      setGame(state)
    },
    [credit, onMessage],
  )

  const runBotTurn = useCallback(
    (state: TeenPattiState) => {
      if (state.phase !== 'playing') return
      const seat = currentSeat(state)
      if (!seat.isBot) return

      const action = botAction(state)
      let next = state

      if (action === 'pack') {
        next = applyPack(state)
        if (next.phase === 'ended') {
          endRound(next)
          return
        }
      } else if (action === 'see') {
        next = applySee(state)
        botLock.current = false
        setGame(next)
        return
      } else if (action === 'show') {
        next = applyShow(state)
        setGame(next)
        botLock.current = false
        return
      } else if (action === 'blind') {
        next = applyBlind(state, blindAmount(state))
      } else {
        const amt = chaalAmount(state, seat.seen)
        next = applyChaal(state, amt)
      }

      if (next.phase === 'ended') {
        endRound(next)
        return
      }

      setGame(next)
      setTimer(15)
      botLock.current = false
    },
    [endRound],
  )

  useEffect(() => {
    if (!game || game.phase !== 'playing') return
    if (currentSeat(game).id === 'you') {
      setTimer(15)
    }
  }, [game?.turnIndex, game?.phase])

  useEffect(() => {
    if (!game || game.phase !== 'playing') return
    const seat = currentSeat(game)
    if (!seat.isBot) {
      botLock.current = false
      return
    }
    if (botLock.current) return
    botLock.current = true
    const t = setTimeout(() => runBotTurn(game), 900 + Math.random() * 600)
    return () => clearTimeout(t)
  }, [game, runBotTurn])

  useEffect(() => {
    if (!isYourTurn) return
    const id = setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [isYourTurn, game?.turnIndex])

  useEffect(() => {
    if (isYourTurn && timer === 0 && game?.phase === 'playing') {
      const next = applyPack(game)
      if (next.phase === 'ended') endRound(next)
      else setGame(next)
    }
  }, [timer, isYourTurn, game, endRound])

  useEffect(() => {
    if (game?.phase === 'showdown') {
      const t = setTimeout(() => endRound(finalizeShowdown(game)), 2800)
      return () => clearTimeout(t)
    }
  }, [game, endRound])

  const onBlind = () => {
    if (!game || !isYourTurn) return
    const amt = blindAmount(game)
    if (!debit(amt)) {
      onMessage?.('Insufficient balance')
      return
    }
    setGame(applyBlind(game, amt))
    setTimer(15)
  }

  const onSee = () => {
    if (!game || !isYourTurn || youSeat?.seen) return
    setGame(applySee(game))
  }

  const onChaal = () => {
    if (!game || !isYourTurn) return
    const seen = youSeat?.seen ?? false
    const amt = chaalAmount(game, seen)
    if (!debit(amt)) {
      onMessage?.('Insufficient balance')
      return
    }
    let next = game
    if (!seen) next = applySee(next)
    setGame(applyChaal(next, amt))
    setTimer(15)
  }

  const onShow = () => {
    if (!game || !isYourTurn || activeCount(game) !== 2) return
    setGame(applyShow(game))
  }

  const onPack = () => {
    if (!game || !isYourTurn) return
    const next = applyPack(game)
    if (next.phase === 'ended') endRound(next)
    else setGame(next)
  }

  const reset = () => {
    setGame(null)
    setTimer(15)
    onMessage?.(null)
  }

  return (
    <TeenPattiDesignUI
      viewportRef={viewportRef}
      layout={layout}
      designW={DESIGN_W}
      designH={DESIGN_H}
      balance={balance}
      boot={boot}
      game={game}
      timer={timer}
      isYourTurn={!!isYourTurn}
      canShow={!!canShow}
      onHome={() => navigate('/home')}
      onJoin={beginRound}
      onBlind={onBlind}
      onSee={onSee}
      onChaal={onChaal}
      onShow={onShow}
      onPack={onPack}
      onReset={reset}
      rootClassName={styles.root}
      canvasClassName={styles.canvas}
    />
  )
}
