import { forwardRef } from 'react'
import { getGameThumb, type S9Game } from '../../data/s9Games'
import styles from './S9GameGrid.module.css'

type Props = {
  games: S9Game[]
  onPlay: (id: string) => void
  columns?: 4 | 5
  scrollable?: boolean
  fixedRows?: number
}

const S9GameGrid = forwardRef<HTMLDivElement, Props>(function S9GameGrid(
  { games, onPlay, columns = 4, scrollable, fixedRows },
  ref,
) {
  const gridClass = fixedRows
    ? styles.gridFixed
    : scrollable
      ? styles.gridVertical
      : columns === 4
        ? styles.grid4
        : styles.grid

  return (
    <div ref={ref} className={styles.wrap}>
      <div className={gridClass}>
        {games.map((game, index) => (
          <button
            key={game.id}
            type="button"
            className={`${styles.tile} ${game.badge === 'hot' ? styles.tileHot : ''}`}
            onClick={() => onPlay(game.id)}
            style={{ animationDelay: `${(index % 8) * 0.05}s` }}
          >
            <div className={styles.tileFrame} aria-hidden />
            <div className={styles.thumb} style={{ background: game.thumbBg }}>
              <img
                className={styles.thumbImg}
                src={getGameThumb(game)}
                alt=""
                loading="lazy"
              />
              <span className={styles.thumbEmoji} aria-hidden>{game.emoji}</span>
              <div className={styles.thumbOverlay} />
              <span className={styles.tileShine} aria-hidden />
              {game.badge === 'hot' && (
                <span className={`${styles.badge} ${styles.badgeHot}`}>
                  <span className={styles.badgeFlame}>🔥</span>
                  Hot
                </span>
              )}
              {game.id === 'aviator' && (
                <span className={styles.multiplier}>99,999x</span>
              )}
            </div>
            <div className={styles.bar} style={{ background: `linear-gradient(180deg, ${game.barColor}dd, #0a0806 100%)` }}>
              <span className={styles.barText}>{game.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
})

export default S9GameGrid
