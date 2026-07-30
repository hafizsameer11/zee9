import { useState, type RefObject } from 'react'
import {
  CATEGORY_CONFIG,
  getDevelopedGamesForCategory,
  getLobbyFeaturedGames,
  PROMO_LEVEL_BONUS,
  REGISTER_BONUS_TIERS,
  formatS9Amount,
  type S9Category,
} from '../../data/s9Games'
import { IconCrown } from './S9Icons'
import S9GameGrid from './S9GameGrid'
import styles from './S9CategoryScreen.module.css'

type Props = {
  category: S9Category
  onPlay: (id: string) => void
  onClaimBonus: () => void
  gridRef?: RefObject<HTMLDivElement | null>
}

export default function S9CategoryScreen({
  category,
  onPlay,
  onClaimBonus,
  gridRef,
}: Props) {
  const config = CATEGORY_CONFIG[category]
  const categoryGames = getDevelopedGamesForCategory(category)
  const featuredGames = getLobbyFeaturedGames()
  const isLobby = category === 'love'
  const games = isLobby ? featuredGames : categoryGames
  const [promoSlide, setPromoSlide] = useState(0)

  return (
    <div className={styles.screen}>
      <aside className={styles.promo}>
        <span className={styles.promoCrown} aria-hidden>
          <IconCrown size={22} />
        </span>
        <span className={styles.promoShine} aria-hidden />
        <p className={styles.promoTitle}>New Register Cashback</p>
        <table className={styles.promoTable}>
          <thead>
            <tr>
              <th>Deposit</th>
              <th>Cashback</th>
              <th>Max Claim</th>
            </tr>
          </thead>
          <tbody>
            {REGISTER_BONUS_TIERS.map((tier) => (
              <tr key={tier.deposit}>
                <td>{tier.deposit}</td>
                <td>{tier.cashback}</td>
                <td>{tier.maxClaim}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={styles.coinDecor} aria-hidden>🪙</div>
        <div className={styles.levelBonus}>
          <span>Current level bonus</span>
          <strong>{formatS9Amount(PROMO_LEVEL_BONUS.current)} Max</strong>
        </div>
        <button type="button" className={styles.claimBtn} onClick={onClaimBonus}>
          DEPOSIT TO UNLOCK
        </button>
        <div className={styles.dots}>
          {[0, 1, 2, 3, 4].map((i) => (
            <button
              key={i}
              type="button"
              className={`${styles.dot} ${promoSlide === i ? styles.dotActive : ''}`}
              onClick={() => setPromoSlide(i)}
              aria-label={`Promo slide ${i + 1}`}
            />
          ))}
        </div>
      </aside>

      <div className={styles.main}>
        <S9GameGrid
          ref={gridRef}
          games={games}
          onPlay={onPlay}
          scrollable
          fixedRows={2}
        />
        {!isLobby && (
          <p className={styles.categoryHint}>{config.title}</p>
        )}
      </div>
    </div>
  )
}
