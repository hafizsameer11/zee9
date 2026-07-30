import { CTRL } from '../constants/assetManifest'
import styles from '../styles/aeroX.module.css'

type Props = {
  muted: boolean
  musicOn: boolean
  vibrateOn: boolean
  onToggleMute: () => void
  onToggleMusic: () => void
  onToggleVibrate: () => void
  onHistory: () => void
  onRules: () => void
  onQuest: () => void
  onClose: () => void
}

export default function SettingsPanel({
  muted,
  musicOn,
  vibrateOn,
  onToggleMute,
  onToggleMusic,
  onToggleVibrate,
  onHistory,
  onRules,
  onQuest,
  onClose,
}: Props) {
  return (
    <div className={styles.settingsScrim} onClick={onClose}>
      <aside className={styles.settingsPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.settingsTitle}>SETTING</div>
        <button type="button" className={styles.settingsItem} onClick={onToggleMute}>
          <img src={muted ? CTRL.mute : CTRL.sound} alt="" />
          <span>Sound</span>
          <em>{muted ? 'Off' : 'On'}</em>
        </button>
        <button type="button" className={styles.settingsItem} onClick={onToggleMusic}>
          <img src={CTRL.music} alt="" />
          <span>Music</span>
          <em>{musicOn ? 'On' : 'Off'}</em>
        </button>
        <button type="button" className={styles.settingsItem} onClick={onToggleVibrate}>
          <img src={CTRL.vibrate} alt="" />
          <span>Vibration</span>
          <em>{vibrateOn ? 'On' : 'Off'}</em>
        </button>
        <button type="button" className={styles.settingsItem} onClick={onHistory}>
          <img src={CTRL.history} alt="" />
          <span>History</span>
        </button>
        <button type="button" className={styles.settingsItem} onClick={onRules}>
          <img src={CTRL.rules} alt="" />
          <span>Rules</span>
        </button>
        <button type="button" className={styles.settingsItem} onClick={onQuest}>
          <img src={CTRL.quest} alt="" />
          <span>Quests</span>
        </button>
      </aside>
    </div>
  )
}
