import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayerAuth } from '../../../api/auth'
import { useSound } from '../../../lib/sound'
import S9ModalShell from './S9ModalShell'
import styles from './SettingsScreen.module.css'

type Props = { onClose: () => void; onToast?: (msg: string) => void }

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${on ? styles.toggleOn : styles.toggleOff}`}
      onClick={onToggle}
      aria-pressed={on}
      data-sfx="tap"
    >
      <span className={styles.toggleKnob} />
      <span className={styles.toggleLabel}>{on ? 'ON' : 'OFF'}</span>
    </button>
  )
}

export default function SettingsScreen({ onClose, onToast }: Props) {
  const navigate = useNavigate()
  const { logout } = usePlayerAuth()
  const { prefs, setPrefs, play } = useSound()
  const [repairing, setRepairing] = useState(false)

  const doLogout = () => {
    play('whoosh')
    logout()
    onClose()
    navigate('/login')
  }

  const repair = async () => {
    if (repairing) return
    setRepairing(true)
    play('coin')
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
      }
      onToast?.('App repaired — reloading…')
      window.setTimeout(() => window.location.reload(), 600)
    } catch {
      onToast?.('Repair failed — try refreshing manually')
      setRepairing(false)
    }
  }

  const resetTutorial = () => {
    play('whoosh')
    try {
      localStorage.removeItem('zee9-tutorial-done')
      localStorage.removeItem('zee9-lucky-wheel-shown')
      sessionStorage.removeItem('zee9-lucky-wheel-shown')
    } catch {
      /* ignore */
    }
    onToast?.('Tutorial reset')
  }

  return (
    <S9ModalShell title="Settings" onClose={onClose} wide hideSupport bodyClassName={styles.bodyPad}>
      <div className={styles.grid}>
        <div className={styles.col}>
          <div className={styles.row}>
            <span className={styles.label}>Game Music:</span>
            <Toggle
              on={prefs.music}
              onToggle={() => {
                setPrefs({ music: !prefs.music })
                play('tap')
              }}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Effect Sound:</span>
            <Toggle
              on={prefs.sfx}
              onToggle={() => {
                const next = !prefs.sfx
                setPrefs({ sfx: next })
                if (next) play('success', { volume: 0.7, force: true })
              }}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Vibrate:</span>
            <Toggle
              on={prefs.vibrate}
              onToggle={() => setPrefs({ vibrate: !prefs.vibrate })}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>SFX Volume:</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(prefs.volume * 100)}
              onChange={(e) => {
                const volume = Number(e.target.value) / 100
                setPrefs({ volume })
                play('coin', { volume: 0.75, force: true })
              }}
              style={{ width: 120 }}
              aria-label="SFX volume"
            />
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Language:</span>
            <button
              type="button"
              className={styles.langBtn}
              data-sfx="select"
              onClick={() => onToast?.('Only English is available')}
            >
              English <span className={styles.chev}>›</span>
            </button>
          </div>
        </div>

        <div className={styles.col}>
          <div className={styles.row}>
            <span className={styles.label}>Click to Repair:</span>
            <button
              type="button"
              className={styles.greenBtn}
              data-sfx="coin"
              onClick={() => void repair()}
              disabled={repairing}
            >
              {repairing ? '…' : 'Start'}
            </button>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Reset Tutorial:</span>
            <button type="button" className={styles.greenBtn} data-sfx="whoosh" onClick={resetTutorial}>
              Reset
            </button>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Test sounds:</span>
            <button
              type="button"
              className={styles.greenBtn}
              data-sfx="select"
              onClick={() => {
                play('win', { force: true })
                setTimeout(() => play('coin', { force: true }), 280)
                setTimeout(() => play('gem', { force: true }), 560)
              }}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      <button type="button" className={styles.logout} onClick={doLogout} data-sfx="close">Logout</button>
    </S9ModalShell>
  )
}
