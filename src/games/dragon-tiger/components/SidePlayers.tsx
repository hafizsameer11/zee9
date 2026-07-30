import styles from './SidePlayers.module.css'

const CT = '/games/casino-table'

export type SidePlayer = {
  id: string
  name: string
  balance: number
  avatar: number
  badge?: 'winner' | 'lucky'
}

export const DEMO_LEFT: SidePlayer[] = [
  { id: 'L1', name: 'mjbori', balance: 36504, avatar: 1, badge: 'winner' },
  { id: 'L2', name: 'P91044', balance: 4280, avatar: 2 },
]

export const DEMO_RIGHT: SidePlayer[] = [
  { id: 'R1', name: 'Mirza', balance: 15620, avatar: 3, badge: 'lucky' },
  { id: 'R2', name: 'G22857', balance: 2340, avatar: 4 },
]

function avatarSrc(n: number) {
  const i = ((n - 1) % 6) + 1
  return `${CT}/players/player-${String(i).padStart(2, '0')}.png`
}

function frameSrc(badge?: 'winner' | 'lucky') {
  if (badge === 'winner') return `${CT}/players/frame-winner.png`
  if (badge === 'lucky') return `${CT}/players/frame-lucky.png`
  return `${CT}/players/frame-normal.png`
}

function PlayerCard({ p }: { p: SidePlayer }) {
  return (
    <div className={styles.card} data-side-player={p.id}>
      {p.badge === 'winner' && <span className={`${styles.badge} ${styles.winner}`}>WINNER</span>}
      {p.badge === 'lucky' && <span className={`${styles.badge} ${styles.lucky}`}>LUCKY</span>}
      <div className={styles.avatarWrap}>
        <img className={styles.avatar} src={avatarSrc(p.avatar)} alt="" draggable={false} />
        <img className={styles.avatarFrame} src={frameSrc(p.badge)} alt="" draggable={false} />
      </div>
      <div className={styles.meta}>
        <span className={styles.name}>{p.name}</span>
        <span className={styles.bal}>{p.balance.toLocaleString()}</span>
      </div>
    </div>
  )
}

function EmptySeat() {
  return (
    <div className={styles.empty} aria-hidden>
      <span>+</span>
    </div>
  )
}

export default function SidePlayers() {
  return (
    <>
      <aside className={`${styles.rail} ${styles.left}`} aria-label="Players left">
        {DEMO_LEFT.map((p) => (
          <PlayerCard key={p.id} p={p} />
        ))}
        <EmptySeat />
      </aside>
      <aside className={`${styles.rail} ${styles.right}`} aria-label="Players right">
        {DEMO_RIGHT.map((p) => (
          <PlayerCard key={p.id} p={p} />
        ))}
        <EmptySeat />
      </aside>
    </>
  )
}

export function selfAvatarSrc(seed = 6) {
  return avatarSrc(seed)
}
