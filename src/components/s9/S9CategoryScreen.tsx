import type { RefObject } from 'react'
import { CATEGORY_CONFIG, getDevelopedGamesForCategory, type S9Category } from '../../data/s9Games'
import S9GameGrid from './S9GameGrid'
import styles from './S9CategoryScreen.module.css'

type Props = {
  category: S9Category
  onPlay: (id: string) => void
  gridRef?: RefObject<HTMLDivElement | null>
}

export default function S9CategoryScreen({ category, onPlay, gridRef }: Props) {
  const config = CATEGORY_CONFIG[category]
  const games = getDevelopedGamesForCategory(category)

  return (
    <div className={styles.screen}>
      {config.showPromo && (
        <aside className={styles.promo}>
          <p className={styles.promoDate}>{config.promoSub}</p>
          <p className={styles.promoTitle}>{config.promoTitle}</p>
          <p className={styles.promoHint}>Deposit on these dates for extra rewards!</p>
          <button type="button" className={styles.promoBtn}>Click Here</button>
        </aside>
      )}

      <div className={styles.main}>
        <div className={styles.head}>
          <h2 className={styles.title}>{config.title}</h2>
          <span className={styles.sub}>{config.subtitle} · {games.length} games</span>
        </div>
        <S9GameGrid
          ref={gridRef}
          games={games}
          onPlay={onPlay}
          scrollable={category === 'all' || games.length > 10}
        />
      </div>
    </div>
  )
}
