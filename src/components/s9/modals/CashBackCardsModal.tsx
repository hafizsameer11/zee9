import { useState } from 'react'
import styles from './CashBackCardsModal.module.css'

export type CashBackCard = {
  id: string
  price: number
  bonusPct: number
  immediate: number
  days: number
  totalGet: number
  lines: string[]
  tone: 'blue' | 'orange' | 'purple' | 'red' | 'green'
  bestValue?: boolean
}

const CARDS: CashBackCard[] = [
  {
    id: 'c2000',
    price: 2000,
    bonusPct: 8.5,
    immediate: 2000,
    days: 7,
    totalGet: 2170,
    lines: ['Get 2000 immediately after recharging', 'Get 20 1st–4th day', 'Get 30 5th–7th day'],
    tone: 'blue',
  },
  {
    id: 'c5000',
    price: 5000,
    bonusPct: 9.4,
    immediate: 5000,
    days: 7,
    totalGet: 5470,
    lines: ['Get 5000 immediately after recharging', 'Get 50 1st–4th day', 'Get 90 5th–7th day'],
    tone: 'orange',
  },
  {
    id: 'c7000',
    price: 7000,
    bonusPct: 13.6,
    immediate: 7000,
    days: 30,
    totalGet: 7950,
    lines: [
      'Get 7000 immediately after recharging',
      'Get 15 1st–10th days',
      'Get 30 11th–20th days',
      'Get 50 21st–30th days',
    ],
    tone: 'purple',
    bestValue: true,
  },
  {
    id: 'c20000',
    price: 20000,
    bonusPct: 14,
    immediate: 15000,
    days: 30,
    totalGet: 22100,
    lines: [
      'Get 15000 immediately after recharging',
      'Get 50 1st–10th days',
      'Get 70 11th–20th days',
      'Get 90 21st–30th days',
    ],
    tone: 'red',
  },
  {
    id: 'c10000',
    price: 10000,
    bonusPct: 11,
    immediate: 10000,
    days: 15,
    totalGet: 11100,
    lines: [
      'Get 10000 immediately after recharging',
      'Get 40 1st–7th days',
      'Get 60 8th–15th days',
    ],
    tone: 'green',
  },
]

type Props = {
  onClose: () => void
  /** Opens simple Add Cash / deposit section */
  onOtherChips: (amount?: number) => void
}

function fmt(n: number) {
  return n.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

export default function CashBackCardsModal({ onClose, onOtherChips }: Props) {
  const [tab, setTab] = useState<'buyable' | 'bought'>('buyable')

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        <button type="button" className={styles.closeX} onClick={onClose} aria-label="Close">×</button>

        <div className={styles.ribbon}>CashBack Cards</div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'buyable' ? styles.tabOn : ''}`}
            onClick={() => setTab('buyable')}
          >
            Buyable
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'bought' ? styles.tabOn : ''}`}
            onClick={() => setTab('bought')}
          >
            Bought
          </button>
        </div>

        <div className={styles.list}>
          {tab === 'bought' ? (
            <p className={styles.empty}>No cards bought yet</p>
          ) : (
            CARDS.map((c) => (
              <div key={c.id} className={`${styles.card} ${styles[c.tone]}`}>
                {c.bestValue && <span className={styles.best}>BEST VALUE</span>}
                <div className={styles.left}>
                  <button
                    type="button"
                    className={styles.priceBtn}
                    onClick={() => onOtherChips(c.price)}
                  >
                    Rs{fmt(c.price)}
                  </button>
                  <p className={styles.bonus}>+{c.bonusPct}% Bonus</p>
                  <ul>
                    {c.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className={styles.mid}>
                  <span>Not Active</span>
                </div>
                <div className={styles.right}>
                  <strong>{c.days} Day</strong>
                  <span>Total get: Rs{fmt(c.totalGet)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <button type="button" className={styles.otherChips} onClick={() => onOtherChips()}>
          Other chips &gt;&gt;
        </button>
      </div>
    </div>
  )
}
