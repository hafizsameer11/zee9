import { forwardRef, useEffect, useRef, useState } from 'react'
import { getGameThumb, type S9Game } from '../../data/s9Games'
import { warmGameById } from '../../lib/lobbyAssetWarmup'
import styles from './S9GameGrid.module.css'

type Props = {
  games: S9Game[]
  onPlay: (id: string) => void
  columns?: 2 | 4 | 5
  scrollable?: boolean
  lobby?: boolean
  fixedRows?: number
}

function ThumbImage({ game, index }: { game: S9Game; index: number }) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [ready, setReady] = useState(false)
  const src = getGameThumb(game)

  useEffect(() => {
    const el = imgRef.current
    if (el?.complete && el.naturalWidth > 0) setReady(true)
  }, [src])

  return (
    <div className={styles.thumb} style={{ background: game.thumbBg }}>
      <img
        ref={imgRef}
        className={`${styles.thumbImg} ${ready ? styles.thumbReady : styles.thumbPending}`}
        src={src}
        alt=""
        width={240}
        height={180}
        decoding="async"
        loading={index < 12 ? 'eager' : 'lazy'}
        fetchPriority={index < 6 ? 'high' : 'auto'}
        draggable={false}
        onLoad={() => setReady(true)}
        onError={(e) => {
          const el = e.currentTarget
          if (el.src.endsWith('.webp')) {
            el.src = el.src.replace(/\.webp$/i, '.png')
            return
          }
          setReady(true)
        }}
      />
      {!ready && <span className={styles.thumbPlaceholder} aria-hidden />}
      <span className={styles.thumbEmoji} aria-hidden>
        {game.emoji}
      </span>
      <div className={styles.thumbOverlay} />
      <span className={styles.tileShine} aria-hidden />
      {game.badge === 'hot' && (
        <span className={`${styles.badge} ${styles.badgeHot}`}>
          <span className={styles.badgeFlame}>🔥</span>
          Hot
        </span>
      )}
      {game.id === 'aviator' && <span className={styles.multiplier}>99,999x</span>}
    </div>
  )
}

const S9GameGrid = forwardRef<HTMLDivElement, Props>(function S9GameGrid(
  { games, onPlay, columns = 4, scrollable, lobby, fixedRows },
  ref,
) {
  const useHorizontal = Boolean(scrollable || fixedRows === 2)

  const gridClass = useHorizontal
    ? styles.gridHorizontal
    : lobby
      ? games.length <= 2
        ? styles.gridLobby
        : styles.gridFixed
      : columns === 4
        ? styles.grid4
        : styles.grid

  return (
    <div
      ref={ref}
      className={`${styles.wrap} ${lobby && !useHorizontal ? styles.wrapLobby : ''} ${
        useHorizontal ? styles.wrapHorizontal : lobby ? styles.wrapNoScroll : ''
      }`}
    >
      <div className={gridClass}>
        {games.map((game, index) => (
          <button
            key={game.id}
            type="button"
            className={`${styles.tile} ${game.badge === 'hot' ? styles.tileHot : ''}`}
            data-sfx="open"
            onPointerDown={() => {
              // Start warming game pack before navigation so GamePlay gate is short
              void warmGameById(game.id)
            }}
            onClick={() => onPlay(game.id)}
            style={{ animationDelay: `${(index % 8) * 0.05}s` }}
          >
            <div className={styles.tileFrame} aria-hidden />
            <ThumbImage game={game} index={index} />
            <div
              className={styles.bar}
              style={{ background: `linear-gradient(180deg, ${game.barColor}dd, #0a0806 100%)` }}
            >
              <span className={styles.barText}>{game.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
})

export default S9GameGrid
