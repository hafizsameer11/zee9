import { useNavigate } from 'react-router-dom'
import type { Game } from '../data/games'
import styles from './GameCard.module.css'

type Props = {
  game: Game
  size?: 'sm' | 'md'
}

export default function GameCard({ game, size = 'md' }: Props) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className={`${styles.card} ${size === 'sm' ? styles.sm : ''}`}
      onClick={() => navigate(`/play/${game.id}`)}
    >
      {game.hot && <span className={styles.badgeHot}>HOT</span>}
      {game.new && <span className={styles.badgeNew}>NEW</span>}
      <span className={styles.emoji}>{game.emoji}</span>
      <span className={styles.name}>{game.name}</span>
      <span className={styles.meta}>
        <span className={styles.dot} />
        {game.players} playing
      </span>
    </button>
  )
}
