import styles from './S9CalendarIcon.module.css'

type Props = { day: string; size?: number; className?: string }

/** Premium 3D calendar badge (07 / 30) matching reference bottom bar */
export default function S9CalendarIcon({ day, size = 40, className }: Props) {
  return (
    <span
      className={`${styles.cal} ${className ?? ''}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className={styles.body}>
        <span className={styles.header} />
        <span className={styles.ring} />
        <span className={styles.day} style={{ fontSize: size * 0.38 }}>{day}</span>
      </span>
    </span>
  )
}
