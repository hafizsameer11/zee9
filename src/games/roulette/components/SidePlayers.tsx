import styles from './SidePlayers.module.css'

const RP = '/games/roulette/players'

export type SidePlayer = {
  id: string
  name: string
  balance: number
  avatar: number
  badge?: 'winner' | 'lucky'
}

export const DEMO_LEFT: SidePlayer[] = [
  { id: 'L1', name: 'P48201', balance: 4280, avatar: 1, badge: 'winner' },
  { id: 'L2', name: 'P91044', balance: 910, avatar: 2 },
  { id: 'L3', name: 'P15502', balance: 1540, avatar: 6 },
]

export const DEMO_RIGHT: SidePlayer[] = [
  { id: 'R1', name: 'P27337', balance: 15620, avatar: 3, badge: 'lucky' },
  { id: 'R2', name: 'P83401', balance: 2340, avatar: 4 },
  { id: 'R3', name: 'P67019', balance: 670, avatar: 5 },
]

function avatarSrc(n: number) {
  const i = ((n - 1) % 6) + 1
  return `${RP}/player-${String(i).padStart(2, '0')}.png`
}

function frameSrc(badge?: 'winner' | 'lucky') {
  if (badge === 'winner') return `${RP}/frame-winner.png`
  if (badge === 'lucky') return `${RP}/frame-lucky.png`
  return `${RP}/frame-normal.png`
}

function PlayerCard({ p }: { p: SidePlayer }) {
  return (
    <div className={`${styles.card} ${p.badge ? styles[`card_${p.badge}`] : ''}`} data-side-player={p.id}>
      <div className={styles.avatarWrap}>
        <span className={styles.aura} aria-hidden />
        <img className={styles.avatar} src={avatarSrc(p.avatar)} alt="" draggable={false} />
        <img className={styles.avatarFrame} src={frameSrc(p.badge)} alt="" draggable={false} />
        <span className={styles.shineSweep} aria-hidden />
        <img className={styles.sparkle} src={`${RP}/sparkle.png`} alt="" draggable={false} />
      </div>
      <div className={styles.meta}>
        <span className={styles.name}>{p.name}</span>
        <span className={styles.bal}>
          <span className={styles.coinDot} aria-hidden />
          {p.balance.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

type Props = {
  left?: SidePlayer[]
  right?: SidePlayer[]
}

export default function SidePlayers({ left = DEMO_LEFT, right = DEMO_RIGHT }: Props) {
  return (
    <>
      <aside className={`${styles.rail} ${styles.left}`} aria-label="Players left">
        {left.map((p) => (
          <PlayerCard key={p.id} p={p} />
        ))}
      </aside>
      <aside className={`${styles.rail} ${styles.right}`} aria-label="Players right">
        {right.map((p) => (
          <PlayerCard key={p.id} p={p} />
        ))}
      </aside>
    </>
  )
}

/** Self / footer avatar — same premium set */
export function selfAvatarSrc(seed = 6) {
  return avatarSrc(seed)
}

export const SELF_FRAME = `${RP}/frame-gold.png`
export const SPARKLE = `${RP}/sparkle.png`
