import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { S9_GAMES } from '../data/s9Games'
import ComingSoon from '../games/components/ComingSoon'
import GameShell from '../games/components/GameShell'
import { getGameEntry, isPlayableGame, isPortraitGame } from '../games/registry'
import { warmGameById } from '../lib/lobbyAssetWarmup'
import Zee9LoadingScreen from '../components/Zee9LoadingScreen'
import styles from './GamePlay.module.css'

export default function GamePlay() {
  const { id } = useParams<{ id: string }>()
  const gameId = id === 'bounty-trail' ? 'wild-bounty' : (id ?? '')
  const entry = getGameEntry(gameId)
  const game = S9_GAMES.find((g) => g.id === gameId)
  const [bet] = useState(10)
  const [message, setMessage] = useState<string | null>(null)
  const [bootReady, setBootReady] = useState(false)
  const [progress, setProgress] = useState(4)

  const title = entry?.title ?? game?.name ?? gameId ?? 'Game'
  const portrait = isPortraitGame(gameId)

  // Don't mount the game UI until critical assets are warm — prevents empty/pop-in frames
  useEffect(() => {
    if (!gameId) {
      setBootReady(true)
      return
    }
    let cancelled = false
    setBootReady(false)
    setProgress(4)
    const started = performance.now()
    void warmGameById(gameId, (pct) => {
      if (!cancelled) setProgress(pct)
    }).finally(async () => {
      const elapsed = performance.now() - started
      const minWait = gameId === 'wild-bounty' ? 0 : 450
      const wait = Math.max(0, minWait - elapsed)
      if (wait) await new Promise((r) => window.setTimeout(r, wait))
      if (!cancelled) {
        setProgress(100)
        setBootReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [gameId])

  if (!bootReady) {
    return (
      <div className={`${styles.shell} ${portrait ? styles.shellPortrait : ''}`}>
        <Zee9LoadingScreen
          progress={progress}
          title={title}
          subtitle="Preparing game assets…"
        />
      </div>
    )
  }

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
