import styles from './TopBar.module.css'
import { ASSET, formatMoney } from '../constants/gameConfig'

export type TickerItem = { id: string; name: string; amount: number }

type Props = {
  balance: number
  onlineCount: number
  tickerItems: TickerItem[]
  onHowTo: () => void
  onMenu: () => void
  onFullscreen: () => void
  onBack: () => void
}

export default function TopBar({
  balance,
  onlineCount,
  tickerItems,
  onHowTo,
  onMenu,
  onFullscreen,
  onBack,
}: Props) {
  const lead = tickerItems[0]
  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.brandHome}
          onClick={onBack}
          aria-label="Back to home"
        >
          <span className={styles.logoMark}>
            <img src={ASSET.chicken('idle')} alt="" />
          </span>
          <strong className={styles.brand}>CHICKEN <em>ROAD</em></strong>
        </button>
        <div className={styles.live}>
          <i />
          <span>Live wins</span>
          <small>Online: {onlineCount}</small>
          {lead && <b>{lead.name} +{formatMoney(lead.amount)}</b>}
        </div>
      </div>
      <div className={styles.right}>
        <button className={styles.how} type="button" onClick={onHowTo}>ⓘ How to play?</button>
        <div className={styles.balance}>{formatMoney(balance)} <span>Rs</span></div>
        <button type="button" onClick={onFullscreen} aria-label="Fullscreen">
          <img src={ASSET.icon('fullscreen')} alt="" />
        </button>
        <button type="button" onClick={onBack} aria-label="Back to lobby">
          <img src={ASSET.icon('prev')} alt="" />
        </button>
        <button type="button" onClick={onMenu} aria-label="Menu">
          <img src={ASSET.icon('menu')} alt="" />
        </button>
      </div>
    </header>
  )
}
