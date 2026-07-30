import { formatNum } from '../constants/gameConfig'
import type { LivePlayer } from '../hooks/useAeroXGame'
import styles from '../styles/aeroX.module.css'

type Props = {
  players: LivePlayer[]
}

/** Fewer taller rows — open stage over density. */
const VISIBLE = 5

export default function PlayerPanel({ players }: Props) {
  const rows = players.slice(0, VISIBLE)

  return (
    <aside className={styles.playerPanel}>
      <div className={styles.playerHead}>
        <span>User</span>
        <span>Bet&amp;X</span>
        <span>Cash Out</span>
      </div>
      <div className={styles.playerList}>
        {rows.map((p) => {
          const state =
            p.cashOut != null ? 'cashed' : p.mult != null ? 'active' : 'bet'
          return (
            <div
              key={p.id}
              className={`${styles.playerRow} ${styles[`player_${state}`] ?? ''} ${
                p.isMe ? styles.playerMe : ''
              }`}
            >
              <div className={styles.playerUser}>
                <img src={p.avatar} alt="" />
                <span>{p.name}</span>
              </div>
              <div className={styles.playerBet}>
                <span>{formatNum(p.bet, 0)}</span>
                {p.mult != null && (
                  <em style={{ color: p.mult < 2 ? '#ff6bb5' : p.mult < 5 ? '#5ef0ff' : '#7dff9a' }}>
                    {p.mult.toFixed(2)}x
                  </em>
                )}
              </div>
              <div className={styles.playerCash}>
                {p.cashOut != null ? (
                  <strong>{formatNum(p.cashOut, 0)}</strong>
                ) : (
                  <span className={styles.dash}>—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
