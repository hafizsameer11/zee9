import { CTRL, UI } from '../constants/assetManifest'
import { MAX_BET, MIN_BET, QUICK_BETS, formatRs, stepBet } from '../constants/gameConfig'
import type { BetSlot } from '../hooks/useAeroXGame'
import styles from '../styles/aeroX.module.css'

type Props = {
  slot: BetSlot
  index: 0 | 1
  phase: string
  mult: number
  onAmount: (n: number) => void
  onTab: (tab: 'bet' | 'auto') => void
  onAutoAt: (n: number) => void
  onAction: () => void
  onClickSfx: () => void
}

export default function BetPanel({
  slot,
  phase,
  mult,
  onAmount,
  onTab,
  onAutoAt,
  onAction,
  onClickSfx,
}: Props) {
  const flying = phase === 'flying'
  const canQueue = flying || phase === 'flewAway' || phase === 'launching'
  const isActive = slot.phase === 'active'
  const isPending = slot.phase === 'pending'
  const isCashed = slot.phase === 'cashed'
  const isQueued = slot.pendingNext

  let btnLabel = 'BET'
  let btnSub = formatRs(slot.amount)
  let btnHint = canQueue && !isQueued ? 'Next Round' : ''
  let btnClass = styles.betBtnGreen

  if (isActive && flying) {
    const pot = Math.floor(slot.wager * mult * 100) / 100
    btnLabel = 'CASH OUT'
    btnSub = formatRs(pot)
    btnHint = ''
    btnClass = styles.betBtnOrange
  } else if (isQueued) {
    btnLabel = 'QUEUED'
    btnSub = formatRs(slot.amount)
    btnHint = 'Tap to cancel'
    btnClass = styles.betBtnQueued
  } else if (isPending) {
    btnLabel = 'CANCEL'
    btnSub = formatRs(slot.wager)
    btnHint = 'Waiting'
    btnClass = styles.betBtnCancel
  } else if (isCashed && !canQueue) {
    btnLabel = 'CASHED'
    btnSub = 'Out'
    btnHint = ''
    btnClass = styles.betBtnDisabled
  }

  const disabled = isActive && !flying

  return (
    <div
      className={styles.betPanel}
      style={{ backgroundImage: `url(${UI.panel})` }}
    >
      <div className={styles.betLeft}>
        <div className={styles.amountRow}>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => {
              onClickSfx()
              onAmount(stepBet(slot.amount, -1))
            }}
            disabled={isActive}
          >
            <img src={CTRL.minus} alt="" />
          </button>
          <div className={styles.amountValue}>{formatRs(slot.amount)}</div>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => {
              onClickSfx()
              onAmount(stepBet(slot.amount, 1))
            }}
            disabled={isActive}
          >
            <img src={CTRL.plus} alt="" />
          </button>
        </div>

        <div className={styles.quickGrid}>
          {QUICK_BETS.map((q) => (
            <button
              key={q}
              type="button"
              className={styles.quickBtn}
              disabled={isActive}
              onClick={() => {
                onClickSfx()
                onAmount(q)
              }}
            >
              {formatRs(q, q >= 100 ? 0 : 2)}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={styles.maxBtn}
          disabled={isPending || isActive}
          onClick={() => {
            onClickSfx()
            onAmount(MAX_BET)
          }}
        >
          MAX
        </button>
      </div>

      <div className={styles.betRight}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${slot.tab === 'bet' ? styles.tabActive : ''}`}
            onClick={() => {
              onClickSfx()
              onTab('bet')
            }}
          >
            Bet
          </button>
          <button
            type="button"
            className={`${styles.tab} ${slot.tab === 'auto' ? styles.tabActive : ''}`}
            onClick={() => {
              onClickSfx()
              onTab('auto')
            }}
          >
            Auto
          </button>
        </div>

        {slot.tab === 'auto' && (
          <div className={styles.autoRow}>
            <span>Auto @</span>
            <input
              type="number"
              min={1.01}
              step={0.1}
              value={slot.autoAt}
              disabled={isActive}
              onChange={(e) => onAutoAt(Math.max(1.01, Number(e.target.value) || 1.01))}
            />
            <span>x</span>
          </div>
        )}

        <button
          type="button"
          className={`${styles.betBtn} ${btnClass}`}
          disabled={disabled}
          onClick={onAction}
        >
          <span className={styles.betBtnMain}>{btnLabel}</span>
          <span className={styles.betBtnSub}>{btnSub}</span>
          {btnHint ? <span className={styles.betBtnHint}>{btnHint}</span> : null}
        </button>
      </div>
    </div>
  )
}

export { MIN_BET }
