import { useNavigate } from 'react-router-dom'
import { GAMES } from '../data/games'
import BalanceCard from '../components/BalanceCard'
import GameCard from '../components/GameCard'
import Header from '../components/Header'
import LuckySpinBanner from '../components/LuckySpinBanner'
import styles from './Home.module.css'

const HOT_GAMES = GAMES.filter((g) => g.hot).slice(0, 6)

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className={styles.home}>
      <Header />

      <main className={styles.main}>
        <BalanceCard
          onDeposit={() => navigate('/wallet')}
          onWithdraw={() => navigate('/wallet')}
        />

        <LuckySpinBanner />

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.gold}>🔥 Hot</span> Games
            </h2>
            <button type="button" className={styles.seeAll} onClick={() => navigate('/games')}>
              See All →
            </button>
          </div>
          <div className={styles.gameGrid}>
            {HOT_GAMES.map((game) => (
              <GameCard key={game.id} game={game} size="sm" />
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>🎰 Live Lottery</h2>
          <div className={styles.lotteryCard} onClick={() => navigate('/play/wingo')} role="button" tabIndex={0}>
            <div className={styles.lotteryLeft}>
              <span className={styles.lotteryEmoji}>🎯</span>
              <div>
                <p className={styles.lotteryTitle}>Wingo Lottery</p>
                <p className={styles.lotterySub}>Next draw in <strong>02:45</strong></p>
              </div>
            </div>
            <span className={styles.lotteryBtn}>Play Now</span>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>⚡ Quick Play</h2>
          <div className={styles.quickRow}>
            {['dragon-tiger', 'mines', 'teen-patti', 'roulette'].map((id) => {
              const game = GAMES.find((g) => g.id === id)!
              return (
                <button
                  key={id}
                  type="button"
                  className={styles.quickItem}
                  onClick={() => navigate(`/play/${id}`)}
                >
                  <span>{game.emoji}</span>
                  <span>{game.name.split(' ')[0]}</span>
                </button>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
