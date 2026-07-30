import { CTRL, UI } from '../constants/assetManifest'
import { formatNum, formatRs, stepBet } from '../constants/gameConfig'
import type { BetSlot } from '../hooks/useAeroXGame'
import styles from '../styles/aeroX.module.css'

type Props = {
  slot: BetSlot
  index: 0 | 1
  phase: string
  mult: number
  onAmount: (n: number) => void
  onAutoBet: (on: boolean) => void
  onAutoEscape: (on: boolean, at?: number) => void
  onAction: () => void
  onClickSfx: () => void
  lastCash?: { mult: number; amount: number } | null
}

export default function BetPanel({
  slot,
  phase,
  mult,
  onAmount,
  onAutoBet,
  onAutoEscape,
  onAction,
  onClickSfx,
  lastCash,
}: Props) {
  const flying = phase === 'flying'
  const waiting = phase === 'waiting' || phase === 'loading'
  const isActive = slot.phase === 'active'
  const isPending = slot.phase === 'pending' && !!slot.betId
  const isQueued = !!slot.queuedNext
  const isCashed = slot.phase === 'cashed'
  const isLost = slot.phase === 'lost'
  const amountLocked = isActive || isPending

  let btnLabel = 'BET'
  let btnSub = waiting ? formatRs(slot.amount) : 'Next Round'
  let btnHint = ''
  let btnClass = styles.betBtnGreen

  if (isQueued) {
    btnLabel = 'QUEUED'
    btnSub = formatRs(slot.amount)
    btnHint = 'Tap cancel'
    btnClass = styles.betBtnCancel
  } else if (isActive && flying) {
    const p = Math.floor(slot.wager * mult * 100) / 100
    btnLabel = 'CASH OUT'
    btnSub = formatRs(p)
    btnHint = ''
    btnClass = styles.betBtnCash
  } else if (isPending) {
    btnLabel = 'CANCEL'
    btnSub = formatRs(slot.wager)
    btnHint = waiting ? 'Waiting' : 'Next round'
    btnClass = styles.betBtnCancel
  } else if (isCashed && waiting) {
    btnLabel = 'CASHED OUT'
    btnSub = lastCash ? formatRs(lastCash.amount) : 'Done'
    btnHint = lastCash ? `@ ${lastCash.mult.toFixed(2)}x` : ''
    btnClass = styles.betBtnDone
  } else if (isLost && waiting) {
    btnLabel = 'LOST'
    btnSub = 'Flew away'
    btnClass = styles.betBtnDisabled
  } else {
    btnLabel = 'BET'
    btnSub = waiting ? formatRs(slot.amount) : 'Next Round'
    btnHint = ''
    btnClass = styles.betBtnGreen
  }

  const canPress =
    isPending ||
    isQueued ||
    (isActive && flying) ||
    (!isActive && !isPending && (waiting || phase === 'flewAway' || flying || phase === 'launching' || isCashed || isLost))

  return (
    <div className={styles.betPanel} style={{ backgroundImage: `url(${UI.panel})` }}>
      <div className={styles.betMain}>
        <div className={styles.amountBlock}>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => {
              onClickSfx()
              onAmount(stepBet(slot.amount, -1))
            }}
            disabled={amountLocked}
          >
            <img src={CTRL.minus} alt="" />
          </button>
          <div className={styles.amountCenter}>
            <span className={styles.amountLabel}>YOUR BET</span>
            <span className={styles.amountValue}>{formatNum(slot.amount, 0)}</span>
          </div>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => {
              onClickSfx()
              onAmount(stepBet(slot.amount, 1))
            }}
            disabled={amountLocked}
          >
            <img src={CTRL.plus} alt="" />
          </button>
        </div>

        <div className={styles.autoRow}>
          <label className={styles.toggle}>
            <span>AUTO BET</span>
            <button
              type="button"
              className={`${styles.switch} ${slot.autoBet ? styles.switchOn : ''}`}
              onClick={() => {
                onClickSfx()
                onAutoBet(!slot.autoBet)
              }}
              aria-pressed={slot.autoBet}
            >
              <i />
            </button>
          </label>
          <label className={styles.toggle}>
            <span>AUTO ESCAPE</span>
            <button
              type="button"
              className={`${styles.switch} ${slot.autoEscape ? styles.switchOn : ''}`}
              onClick={() => {
                onClickSfx()
                onAutoEscape(!slot.autoEscape)
              }}
              aria-pressed={slot.autoEscape}
            >
              <i />
            </button>
            <input
              className={styles.escapeInput}
              type="number"
              min={1.01}
              step={0.1}
              value={Number(slot.autoAt).toFixed(2)}
              disabled={amountLocked}
              onChange={(e) =>
                onAutoEscape(slot.autoEscape, Math.max(1.01, Number(e.target.value) || 1.01))
              }
            />
            <span className={styles.escapeX}>x</span>
          </label>
        </div>
      </div>

      <button
        type="button"
        className={`${styles.betBtn} ${btnClass}`}
        disabled={!canPress && !isPending && !(isActive && flying)}
        onClick={onAction}
      >
        <span className={styles.betBtnMain}>{btnLabel}</span>
        <span className={styles.betBtnSub}>{btnSub}</span>
        {btnHint ? <span className={styles.betBtnHint}>{btnHint}</span> : null}
      </button>
    </div>
  )
}
