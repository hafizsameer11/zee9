import { formatMoney, FREE_SPIN_COUNT, featureBuyCost } from '../constants/gameConfig'
import { SYMBOLS } from '../constants/symbolConfig'
import type { HistoryRound } from '../hooks/useBountyTrailGame'
import { ASSET } from '../constants/gameConfig'
import styles from '../styles/bountyTrail.module.css'

export function FeatureBuyModal({
  bet,
  balance,
  onBuy,
  onClose,
}: {
  bet: number
  balance: number
  onBuy: () => void
  onClose: () => void
}) {
  const cost = featureBuyCost(bet)
  const ok = balance >= cost
  return (
    <div className={`${styles.dim} ${styles.dimCenter}`} onClick={onClose} role="presentation">
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Feature Buy">
        <img className={styles.modalArt} src={ASSET.featurePurchase} alt="" draggable={false} />
        <div className={styles.sheetTitle} style={{ marginBottom: 8 }}>
          High Noon Free Spins
        </div>
        <div className={styles.modalBody}>
          Purchase {FREE_SPIN_COUNT} free spins with enhanced gold-frame chance and persistent multipliers.
          <br />
          <strong>Price: {formatMoney(cost)}</strong>
          {!ok && (
            <>
              <br />
              <span style={{ color: '#ff8a70' }}>Insufficient balance</span>
            </>
          )}
        </div>
        <div className={styles.sheetActions}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.btnGold} disabled={!ok} onClick={onBuy}>
            Buy Feature
          </button>
        </div>
      </div>
    </div>
  )
}

export function PaytableModal({ onClose }: { onClose: () => void }) {
  return (
    <div className={`${styles.dim} ${styles.dimCenter}`} onClick={onClose} role="presentation">
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Paytable">
        <div className={styles.sheetHead}>
          <div className={styles.sheetTitle}>Paytable</div>
          <button type="button" className={styles.closeX} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          Wins pay left to right on adjacent reels. Wild substitutes for all except Scatter and Bonus.
          Gold-framed symbols can raise the High Noon multiplier track.
        </div>
        <div className={styles.payGrid}>
          {SYMBOLS.filter((s) => s.kind !== 'special').map((s) => (
            <div key={s.id} className={styles.payItem}>
              <img src={s.src} alt={s.label} draggable={false} />
              <span>
                {s.label}
                <br />
                6× {s.pays[3]}
              </span>
            </div>
          ))}
        </div>
        <div className={styles.modalBody}>
          <strong>Wild</strong> — substitutes and boosts ways.
          <br />
          <strong>Scatter</strong> — 3+ award free spins.
          <br />
          <strong>Feature Buy</strong> — jump straight into High Noon Free Spins.
        </div>
      </div>
    </div>
  )
}

export function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className={`${styles.dim} ${styles.dimCenter}`} onClick={onClose} role="presentation">
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Rules">
        <div className={styles.sheetHead}>
          <div className={styles.sheetTitle}>Rules</div>
          <button type="button" className={styles.closeX} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          1. Choose a bet, then press Spin.
          <br />
          2. Matching symbols on consecutive reels from the left create ways wins.
          <br />
          3. Gold frames can advance the multiplier board (x1 → x1024).
          <br />
          4. Three or more Scatters trigger High Noon Free Spins.
          <br />
          5. During free spins the bet is not deducted again.
          <br />
          6. Feature Buy purchases the free-spin feature at a fixed bet multiple.
        </div>
      </div>
    </div>
  )
}

export function HistoryModal({
  rounds,
  onClose,
}: {
  rounds: HistoryRound[]
  onClose: () => void
}) {
  return (
    <div className={`${styles.dim} ${styles.dimCenter}`} onClick={onClose} role="presentation">
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="History">
        <div className={styles.sheetHead}>
          <div className={styles.sheetTitle}>History</div>
          <button type="button" className={styles.closeX} onClick={onClose}>
            ×
          </button>
        </div>
        {rounds.length === 0 && <div className={styles.modalBody}>No rounds yet.</div>}
        {rounds.map((r) => (
          <div key={r.id} className={styles.historyRow}>
            <div>
              <div>{new Date(r.at).toLocaleTimeString()}</div>
              <div style={{ opacity: 0.7 }}>{r.note}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>Bet {formatMoney(r.bet)}</div>
              <div style={{ color: r.win > 0 ? '#f0c14b' : undefined }}>Win {formatMoney(r.win)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function QuitModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <div className={`${styles.dim} ${styles.dimCenter}`} onClick={onClose} role="presentation">
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Quit">
        <div className={styles.sheetTitle} style={{ marginBottom: 10 }}>
          Leave Wild Bounty?
        </div>
        <div className={styles.modalBody}>Your session progress stays in this browser wallet.</div>
        <div className={styles.sheetActions}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>
            Stay
          </button>
          <button type="button" className={styles.btnGold} onClick={onConfirm}>
            Quit
          </button>
        </div>
      </div>
    </div>
  )
}

export function UtilityMenu({
  muted,
  onToggleSound,
  onLobby,
  onPaytable,
  onRules,
  onHistory,
  onQuit,
  onFullscreen,
  onClose,
}: {
  muted: boolean
  onToggleSound: () => void
  onLobby: () => void
  onPaytable: () => void
  onRules: () => void
  onHistory: () => void
  onQuit: () => void
  onFullscreen: () => void
  onClose: () => void
}) {
  return (
    <div className={`${styles.dim} ${styles.dimCenter}`} onClick={onClose} role="presentation">
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Menu">
        <div className={styles.sheetHead}>
          <div className={styles.sheetTitle}>Settings</div>
          <button type="button" className={styles.closeX} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.utilityMenu}>
          <button type="button" className={styles.utilBtn} onClick={onLobby}>
            <img src={ASSET.icons.lobby} alt="" />
            Lobby
          </button>
          <button type="button" className={styles.utilBtn} onClick={onToggleSound}>
            <img src={muted ? ASSET.icons.soundOff : ASSET.icons.sound} alt="" />
            Sound
          </button>
          <button type="button" className={styles.utilBtn} onClick={onPaytable}>
            <img src={ASSET.icons.paytable} alt="" />
            Paytable
          </button>
          <button type="button" className={styles.utilBtn} onClick={onRules}>
            <img src={ASSET.icons.rules} alt="" />
            Rules
          </button>
          <button type="button" className={styles.utilBtn} onClick={onHistory}>
            <img src={ASSET.icons.history} alt="" />
            History
          </button>
          <button type="button" className={styles.utilBtn} onClick={onFullscreen}>
            <img src={ASSET.icons.menu} alt="" />
            Fullscreen
          </button>
          <button type="button" className={styles.utilBtn} onClick={onQuit}>
            <img src={ASSET.icons.quit} alt="" />
            Quit
          </button>
        </div>
      </div>
    </div>
  )
}
