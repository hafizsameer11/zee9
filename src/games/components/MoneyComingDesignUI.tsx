import type { RefObject } from 'react'
import { ArrowLeft, Zap } from 'lucide-react'
import { getDesignCanvasStyle, getDesignScaleShellStyle, type DesignLayout } from '../hooks/useDesignScale'
import { type McMult, type McNumber } from '../engines/moneyComing'
import styles from './moneyComing.module.css'

const UI = '/games/money-coming/ui'
const ASSETS = {
  bg: '/games/money-coming/bg.png',
  frame: `${UI}/ys_frame_slot.png`,
  logo: `${UI}/logo_en_1685597575.png`,
  wheel: `${UI}/wheel_generated.png`,
  spinBg: `${UI}/spin_bg.png`,
  spinArrow: `${UI}/btn_ks2.png`,
  spinWord: `${UI}/ty_img_Spin.png`,
  auto: `${UI}/yx_img_btn_autospin.png`,
  add: `${UI}/ty_btn_chipsadd.png`,
  betCoin: `${UI}/btn_jb.png`,
  infoBg: `${UI}/bet_img_frame.png`,
  infoBg2: `${UI}/bet_img_frame1.png`,
  scatterRow: `${UI}/yx_img_bet_50.png`,
  unlock10: `${UI}/bet_img_10x.png`,
  mult10: `${UI}/yx_img_bet_10.png`,
  respin: `${UI}/yx_img_respin.png`,
}

function MoneyWheel({ spinning }: { spinning: boolean }) {
  return (
    <div className={`${styles.wheelHost} ${spinning ? styles.wheelFast : ''}`}>
      <div className={styles.wheelPointer} aria-hidden>
        <span>$</span>
      </div>
      <div className={styles.wheelRim}>
        <img className={styles.wheelDisk} src={ASSETS.wheel} alt="" draggable={false} />
        <span className={styles.wheelShine} />
      </div>
    </div>
  )
}

export type MoneyComingDesignUIProps = {
  viewportRef: RefObject<HTMLDivElement | null>
  layout: DesignLayout
  balance: number
  betAmount: number
  reels: [McNumber, McNumber, McNumber]
  mult: McMult
  strips: readonly [McNumber[], McNumber[], McNumber[]]
  multStrip: McMult[]
  spinning: boolean
  shine: boolean
  wheelSpinning: boolean
  lastWin: number
  turbo: boolean
  auto: boolean
  onHome: () => void
  onSpin: () => void
  onBetPlus: () => void
  onBetMinus: () => void
  onToggleTurbo: () => void
  onToggleAuto: () => void
}

function MultBadge({ value }: { value: McMult }) {
  if (value === '—') {
    return (
      <span className={`${styles.multBadge} ${styles.multNeutral}`}>
        <b>$</b>
        <small>WIN</small>
      </span>
    )
  }
  if (value === '10x') {
    return (
      <span className={`${styles.multBadge} ${styles.multImgWrap}`}>
        <img src={ASSETS.mult10} alt="10x" className={styles.multImg} draggable={false} />
      </span>
    )
  }
  if (value === 'RESPIN') {
    return (
      <span className={`${styles.multBadge} ${styles.multRespin}`}>
        <img src={ASSETS.respin} alt="RESPIN" className={styles.multRespinImg} draggable={false} />
      </span>
    )
  }
  const cls = value === '5x' ? styles.mult5 : styles.mult2
  return (
    <span className={`${styles.multBadge} ${cls}`}>
      <b>{value}</b>
      <small>WIN</small>
    </span>
  )
}

function NumberReel({
  value,
  strip,
  spinning,
  delay,
}: {
  value: McNumber
  strip: McNumber[]
  spinning: boolean
  delay: number
}) {
  const cells = spinning ? [...strip, ...strip.slice(0, 8), value] : neighbors(value)

  return (
    <div className={styles.numReel}>
      <div className={styles.reelCurve} />
      <div className={styles.reelShade} />
      <div className={styles.reelWindow}>
        <div
          className={`${styles.reelStrip} ${spinning ? styles.reelSpinning : styles.reelIdle}`}
          style={
            spinning
              ? { animationDuration: `${1.35 + delay}s`, animationDelay: `${delay * 0.06}s` }
              : undefined
          }
        >
          {cells.map((n, i) => (
            <div key={`${i}-${n}`} className={styles.reelCell}>
              <span className={`${styles.digit}${n >= 10 ? ` ${styles.digitWide}` : ''}`}>{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function neighbors(n: McNumber): McNumber[] {
  const pool: McNumber[] = [0, 1, 2, 3, 5, 10]
  const i = pool.indexOf(n)
  return [pool[(i - 1 + pool.length) % pool.length]!, n, pool[(i + 1) % pool.length]!]
}

function neighborsMult(m: McMult): McMult[] {
  const pool: McMult[] = ['2x', '5x', '10x', 'RESPIN']
  if (m === '—') return ['5x', '2x', '10x']
  const i = pool.indexOf(m)
  if (i < 0) return ['5x', '2x', '10x']
  return [pool[(i - 1 + pool.length) % pool.length]!, m, pool[(i + 1) % pool.length]!]
}

export default function MoneyComingDesignUI({
  viewportRef,
  layout,
  balance,
  betAmount,
  reels,
  mult,
  strips,
  multStrip,
  spinning,
  shine,
  wheelSpinning,
  lastWin,
  turbo,
  auto,
  onHome,
  onSpin,
  onBetPlus,
  onBetMinus,
  onToggleTurbo,
  onToggleAuto,
}: MoneyComingDesignUIProps) {
  const multCells = spinning ? [...multStrip, ...multStrip.slice(0, 6), mult] : neighborsMult(mult)

  return (
    <div className={styles.root} ref={viewportRef}>
      <div style={getDesignScaleShellStyle(layout)}>
        <div className={styles.canvas} style={getDesignCanvasStyle(layout)}>
          <div className={styles.bg} style={{ backgroundImage: `url(${ASSETS.bg})` }} />

          <header className={styles.topBar}>
            <div className={styles.topLeft}>
              <button type="button" className={styles.backBtn} onClick={onHome} aria-label="Back">
                <ArrowLeft size={24} strokeWidth={3} />
              </button>
              <div className={styles.promo}>
                <span className={styles.promoOrb} />
                <span className={styles.promoText}>
                  <span>Play Game</span>
                  <em>Rs{betAmount}</em>
                </span>
              </div>
            </div>

            <img className={styles.logo} src={ASSETS.logo} alt="Money Coming" draggable={false} />

            <div className={styles.topRight}>
              <button type="button" className={styles.addBtn} aria-label="Add funds">
                <img src={ASSETS.add} alt="" draggable={false} />
              </button>
              <button type="button" className={styles.menuBtn} aria-label="Menu">
                <i />
                <i />
                <i />
                <i />
              </button>
            </div>
          </header>

          <div className={styles.stage}>
            <MoneyWheel spinning={wheelSpinning} />

            <div className={styles.infoStack}>
              <div className={styles.infoCard}>
                <img className={styles.infoBg} src={ASSETS.infoBg} alt="" draggable={false} />
                <div className={styles.infoBody}>
                  <span className={styles.infoLabel}>
                    Bet <em>50</em>
                  </span>
                  <img className={styles.scatterImg} src={ASSETS.scatterRow} alt="" draggable={false} />
                </div>
              </div>
              <div className={`${styles.infoCard} ${styles.infoCardGold}`}>
                <img className={styles.infoBg} src={ASSETS.infoBg2} alt="" draggable={false} />
                <div className={styles.infoBody}>
                  <span className={styles.infoLabel}>
                    Bet <em>10</em> unlock
                  </span>
                  <img className={styles.unlockImg} src={ASSETS.unlock10} alt="" draggable={false} />
                </div>
              </div>
            </div>

            <div className={`${styles.machine} ${shine ? styles.machineShine : ''}`}>
              <div className={styles.reelBed}>
                <div className={styles.numGroup}>
                  <NumberReel value={reels[0]} strip={strips[0]!} spinning={spinning} delay={0} />
                  <NumberReel value={reels[1]} strip={strips[1]!} spinning={spinning} delay={0.22} />
                  <NumberReel value={reels[2]} strip={strips[2]!} spinning={spinning} delay={0.44} />
                </div>
                <div className={styles.multReel}>
                  <div className={styles.reelCurveGold} />
                  <div className={styles.reelShade} />
                  <div className={styles.reelWindow}>
                    <div
                      className={`${styles.reelStrip} ${spinning ? styles.reelSpinning : styles.reelIdle}`}
                      style={spinning ? { animationDuration: '1.95s' } : undefined}
                    >
                      {multCells.map((m, i) => (
                        <div key={`m-${i}-${m}`} className={styles.reelCell}>
                          <MultBadge value={m} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={styles.payline} />
                {shine && <div className={styles.shineSweep} />}
              </div>
              <img className={styles.frameImg} src={ASSETS.frame} alt="" draggable={false} />
            </div>
          </div>

          <footer className={styles.bottomBar}>
            <div className={styles.statBlock}>
              <span className={styles.statLabel}>Balance</span>
              <span className={styles.statValue}>Rs{Math.round(balance).toLocaleString('en-PK')}</span>
            </div>
            <div className={styles.divider} aria-hidden />
            <div className={styles.betBlock}>
              <button type="button" className={styles.betCoinBtn} onClick={onBetPlus} disabled={spinning}>
                <img src={ASSETS.betCoin} alt="" draggable={false} />
              </button>
              <div className={styles.statBlock}>
                <span className={styles.statLabel}>Bet</span>
                <span className={styles.statValue}>Rs{betAmount}</span>
              </div>
              <button
                type="button"
                className={styles.betMinus}
                onClick={onBetMinus}
                disabled={spinning}
                aria-label="Lower bet"
              >
                −
              </button>
            </div>
            <div className={styles.divider} aria-hidden />
            <div className={styles.statBlock}>
              <span className={styles.statLabel}>WIN</span>
              <span className={`${styles.statValue} ${lastWin > 0 ? styles.winFlash : ''}`}>
                Rs{Math.round(lastWin).toLocaleString('en-PK')}
              </span>
            </div>
            <div className={styles.footerSpacer} aria-hidden />
            <div className={styles.ctrlGroup}>
              <button
                type="button"
                className={`${styles.ctrlBtn} ${turbo ? styles.ctrlOn : ''}`}
                onClick={onToggleTurbo}
                title="Quick stop"
                aria-label="Turbo"
              >
                <Zap size={20} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                className={`${styles.ctrlBtn} ${auto ? styles.ctrlOn : ''}`}
                onClick={onToggleAuto}
                title="Auto spin"
                aria-label="Auto spin"
              >
                <img src={ASSETS.auto} alt="" draggable={false} />
              </button>
              <span className={styles.hint}>Press quick stop.</span>
            </div>
            <div className={styles.spinSlot} aria-hidden />
          </footer>

          <button
            type="button"
            className={`${styles.spinBtn} ${spinning ? styles.spinActive : ''}`}
            onClick={onSpin}
            disabled={spinning}
            aria-label="Spin"
          >
            <span className={styles.spinRing} />
            <img className={styles.spinDiskImg} src={ASSETS.spinBg} alt="" draggable={false} />
            <img className={styles.spinArrow} src={ASSETS.spinArrow} alt="" draggable={false} />
            <img className={styles.spinWord} src={ASSETS.spinWord} alt="" draggable={false} />
            <span className={styles.spinShine} />
          </button>
        </div>
      </div>
    </div>
  )
}
