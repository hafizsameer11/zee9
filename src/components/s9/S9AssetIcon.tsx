import styles from './S9AssetIcon.module.css'

export const S9_ASSETS = {
  wheelCoinSheet: '/s9/icons/sprite-wheel-coin.png',
  betWheelSheet: '/s9/icons/sprite-bet-wheel.png',
  rechargeChest: '/s9/icons/recharge-chest.png',
  cashbackPot: '/s9/icons/cashback-pot.png',
  giftDaily: '/s9/icons/gift-daily.png',
  coinsStack: '/s9/icons/coins-stack.png',
  referShare: '/s9/icons/refer-share.png',
} as const

type SpriteCrop = {
  src: string
  /** background-size width as multiple of element (2 = half of sheet shown) */
  scale: number
  posX: number
  posY: number
}

const SPRITES: Record<string, SpriteCrop> = {
  wheel: { src: S9_ASSETS.wheelCoinSheet, scale: 2, posX: 0, posY: 0 },
  coin: { src: S9_ASSETS.wheelCoinSheet, scale: 2, posX: 50, posY: 0 },
  betWheel: { src: S9_ASSETS.betWheelSheet, scale: 2.2, posX: 55, posY: 52 },
  referShare: { src: S9_ASSETS.referShare, scale: 3.5, posX: 38, posY: 8 },
  gift: { src: S9_ASSETS.giftDaily, scale: 2.4, posX: 2, posY: 2 },
}

type Props = {
  name: keyof typeof SPRITES | 'recharge' | 'cashback' | 'gift' | 'coins'
  size?: number
  className?: string
}

const FULL_IMAGES: Record<string, string> = {
  recharge: S9_ASSETS.rechargeChest,
  cashback: S9_ASSETS.cashbackPot,
  gift: S9_ASSETS.giftDaily,
  coins: S9_ASSETS.coinsStack,
}

export default function S9AssetIcon({ name, size = 40, className }: Props) {
  const sprite = SPRITES[name]
  if (sprite) {
    return (
      <span
        className={`${styles.wrap} ${className ?? ''}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <span
          className={styles.sprite}
          style={{
            backgroundImage: `url(${sprite.src})`,
            backgroundSize: `${sprite.scale * 100}%`,
            backgroundPosition: `${sprite.posX}% ${sprite.posY}%`,
          }}
        />
      </span>
    )
  }

  const src = FULL_IMAGES[name]
  if (!src) return null

  return (
    <span className={`${styles.wrap} ${className ?? ''}`} style={{ width: size, height: size }} aria-hidden>
      <img className={styles.img} src={src} alt="" draggable={false} />
    </span>
  )
}
