import { forwardRef } from 'react'
import { getGameThumb, type S9Game } from '../../data/s9Games'
import { isPlayableGame } from '../../games/registry'
import styles from './S9GameGrid.module.css'

type Props = {
  games: S9Game[]
  onPlay: (id: string) => void
  scrollable?: boolean
}

const S9GameGrid = forwardRef<HTMLDivElement, Props>(function S9GameGrid(
  { games, onPlay, scrollable },
  ref,
) {
  const display = scrollable ? games : games.slice(0, 10)

  return (
    <div ref={ref} className={styles.wrap}>
      <div className={scrollable ? styles.gridVertical : styles.grid}>
        {display.map((game) => (
          <button
            key={game.id}
            type="button"
            className={styles.tile}
            onClick={() => onPlay(game.id)}
          >
            <div className={styles.thumb}>
              <img
                className={styles.thumbImg}
                src={getGameThumb(game)}
                alt=""
                loading="lazy"
              />
              <div className={styles.thumbOverlay} />
              {game.badge === 'hot' && (
                <span className={`${styles.badge} ${styles.badgeHot}`}>
                  <span className={styles.badgeFlame} aria-hidden>🔥</span> HOT
                </span>
              )}
              {game.badge === 'new' && (
                <span className={`${styles.badge} ${styles.badgeNew}`}>NEW</span>
              )}
              {game.badge === 'live' && (
                <span className={`${styles.badge} ${styles.badgeLive}`}>LIVE</span>
              )}
              {isPlayableGame(game.id) ? (
                <span className={`${styles.badge} ${styles.badgePlay}`}>PLAY</span>
              ) : (
                <span className={`${styles.badge} ${styles.badgeSoon}`}>SOON</span>
              )}
              {game.id === 'lobby' && <span className={styles.moreBtn}>More+</span>}
            </div>
            <div className={styles.bar}>
              <span className={styles.barText}>{game.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
})

export default S9GameGrid
