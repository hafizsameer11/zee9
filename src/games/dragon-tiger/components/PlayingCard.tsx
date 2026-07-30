import type { CSSProperties } from 'react'
import { ASSET, type PlayingCard as Card } from '../constants/gameConfig'
import styles from './PlayingCard.module.css'

type Props = {
  card?: Card | null
  faceUp?: boolean
  dealing?: boolean
  flipping?: boolean
  className?: string
  style?: CSSProperties
}

export default function PlayingCard({
  card,
  faceUp = false,
  dealing = false,
  flipping = false,
  className = '',
  style,
}: Props) {
  return (
    <div
      className={`${styles.wrap} ${dealing ? styles.dealing : ''} ${flipping ? styles.flipping : ''} ${className}`}
      style={style}
    >
      <div className={`${styles.inner} ${faceUp ? styles.faceUp : ''}`}>
        <div className={styles.face + ' ' + styles.back}>
          <img src={ASSET.cardBack} alt="" draggable={false} />
        </div>
        <div className={styles.face + ' ' + styles.front}>
          {card ? (
            <img src={ASSET.card(card.rank, card.suit)} alt={`${card.rank}${card.suit}`} draggable={false} />
          ) : (
            <img src={ASSET.cardBack} alt="" draggable={false} />
          )}
        </div>
      </div>
    </div>
  )
}
