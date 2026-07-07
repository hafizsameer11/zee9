import { useState } from 'react'
import { GAMES, CATEGORY_LABELS, type GameCategory } from '../data/games'
import GameCard from '../components/GameCard'
import styles from './Games.module.css'

const CATEGORIES: (GameCategory | 'all')[] = ['all', 'hot', 'cards', 'lottery', 'casual', 'sports']

export default function Games() {
  const [active, setActive] = useState<GameCategory | 'all'>('all')

  const filtered = active === 'all'
    ? GAMES
    : GAMES.filter((g) => g.category === active)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.gold}>All</span> Games
        </h1>
        <p className={styles.count}>{GAMES.length} games available</p>
      </header>

      <div className={styles.categories}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`${styles.chip} ${active === cat ? styles.chipActive : ''}`}
            onClick={() => setActive(cat)}
          >
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat].replace(/^.\s/, '')}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {filtered.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  )
}
