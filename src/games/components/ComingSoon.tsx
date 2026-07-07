import { useNavigate } from 'react-router-dom'
import { getGameThumb, S9_GAMES } from '../../data/s9Games'
import styles from './comingSoon.module.css'

type Props = { gameId: string }

export default function ComingSoon({ gameId }: Props) {
  const navigate = useNavigate()
  const game = S9_GAMES.find((g) => g.id === gameId)
  const thumb = game ? getGameThumb(game) : '/logo.png'

  return (
    <div className={styles.wrap}>
      <img src={thumb} alt="" className={styles.thumb} />
      <h2>{game?.name ?? gameId}</h2>
      <p className={styles.badge}>Coming Soon</p>
      <p className={styles.hint}>This game is not available in the demo yet.</p>
      <button type="button" className={styles.back} onClick={() => navigate('/home')}>
        Back to Lobby
      </button>
    </div>
  )
}
