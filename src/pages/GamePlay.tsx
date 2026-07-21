import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { S9_GAMES } from '../data/s9Games'
import ComingSoon from '../games/components/ComingSoon'
import GameShell from '../games/components/GameShell'
import { getGameEntry, isPlayableGame, isPortraitGame } from '../games/registry'
import styles from './GamePlay.module.css'

export default function GamePlay() {
  const { id } = useParams<{ id: string }>()
  const gameId = id ?? ''
  const entry = getGameEntry(gameId)
  const game = S9_GAMES.find((g) => g.id === gameId)
  const [bet] = useState(100)
  const [message, setMessage] = useState<string | null>(null)

  const title = entry?.title ?? game?.name ?? gameId ?? 'Game'
  const portrait = isPortraitGame(gameId)

  if (!entry) {
    return (
      <GameShell title={title} message={message}>
        <ComingSoon gameId={gameId} />
      </GameShell>
    )
  }

  const GameComponent = entry.component

  if (isPlayableGame(gameId)) {
    return (
      <div className={`${styles.shell} ${portrait ? styles.shellPortrait : ''}`}>
        {message && <div className={styles.toast}>{message}</div>}
        <GameComponent gameId={gameId} bet={bet} onMessage={setMessage} />
      </div>
    )
  }

  return (
    <GameShell title={title} message={message}>
      <GameComponent gameId={gameId} bet={bet} onMessage={setMessage} />
    </GameShell>
  )
}
