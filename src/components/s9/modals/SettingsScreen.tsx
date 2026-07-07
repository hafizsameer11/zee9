import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import S9ModalShell from './S9ModalShell'
import styles from './SettingsScreen.module.css'

type Props = { onClose: () => void }

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${on ? styles.toggleOn : styles.toggleOff}`}
      onClick={onToggle}
      aria-pressed={on}
    >
      <span className={styles.toggleKnob} />
      <span className={styles.toggleLabel}>{on ? 'ON' : 'OFF'}</span>
    </button>
  )
}

export default function SettingsScreen({ onClose }: Props) {
  const navigate = useNavigate()
  const [gameMusic, setGameMusic] = useState(true)
  const [effectSound, setEffectSound] = useState(true)
  const [vibrate, setVibrate] = useState(true)

  const logout = () => {
    onClose()
    navigate('/login')
  }

  return (
    <S9ModalShell title="Settings" onClose={onClose} wide hideSupport bodyClassName={styles.bodyPad}>
      <div className={styles.grid}>
        <div className={styles.col}>
          <div className={styles.row}>
            <span className={styles.label}>Game Music:</span>
            <Toggle on={gameMusic} onToggle={() => setGameMusic((v) => !v)} />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Effect Sound:</span>
            <Toggle on={effectSound} onToggle={() => setEffectSound((v) => !v)} />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Vibrate:</span>
            <Toggle on={vibrate} onToggle={() => setVibrate((v) => !v)} />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Language:</span>
            <button type="button" className={styles.langBtn}>
              English <span className={styles.chev}>›</span>
            </button>
          </div>
        </div>

        <div className={styles.col}>
          <div className={styles.row}>
            <span className={styles.label}>Click to Repair:</span>
            <button type="button" className={styles.greenBtn}>Start</button>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Reset Tutorial:</span>
            <button type="button" className={styles.greenBtn}>Reset</button>
          </div>
        </div>
      </div>

      <button type="button" className={styles.logout} onClick={logout}>Logout</button>
    </S9ModalShell>
  )
}
