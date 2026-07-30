import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type S9Category } from '../../data/s9Games'
import { api } from '../../api/client'
import { useConfig, useNotifications } from '../../api/hooks'
import { useWallet } from '../../context/WalletContext'
import { usePlayerAuth } from '../../api/auth'
import { loadPayoutAccount, savePayoutAccount, type PayoutAccount } from '../../api/payoutAccount'
import { ensureLobbyAssetsReady, startLobbyAssetWarmup } from '../../lib/lobbyAssetWarmup'
import Zee9LoadingScreen from '../Zee9LoadingScreen'
import S9Header from './S9Header'
import S9Ticker from './S9Ticker'
import S9Sidebar from './S9Sidebar'
import S9CategoryScreen from './S9CategoryScreen'
import S9BottomBar from './S9BottomBar'
import AddCashModal from './modals/AddCashModal'
import BindWithdrawModal from './modals/BindWithdrawModal'
import WithdrawScreen from './modals/WithdrawScreen'
import LuckyWheelModal from './modals/LuckyWheelModal'
import ReferEarnScreen from './modals/ReferEarnScreen'
import UserProfileScreen from './modals/UserProfileScreen'
import AccountRecordsModal from './modals/AccountRecordsModal'
import NewsScreen from './modals/NewsScreen'
import SupportScreen from './modals/SupportScreen'
import MailScreen from './modals/MailScreen'
import SettingsScreen from './modals/SettingsScreen'
import WelcomeBonusModal from './modals/WelcomeBonusModal'
import TransactionHistoryModal from './modals/TransactionHistoryModal'
import GrabBonusModal from './modals/GrabBonusModal'
import RebateModal from './modals/RebateModal'
import VipSalaryModal from './modals/VipSalaryModal'
import ReturnBonusModal from './modals/ReturnBonusModal'
import CashBackCardsModal from './modals/CashBackCardsModal'
import FreeCashModal from './modals/FreeCashModal'
import styles from './S9Lobby.module.css'
import './s9Animations.css'

const LUCKY_WHEEL_SESSION_KEY = 'zee9-lucky-wheel-shown'

export default function S9Lobby() {
  const navigate = useNavigate()
  const gridRef = useRef<HTMLDivElement>(null)
  const config = useConfig()
  const notif = useNotifications()
  const { refresh } = useWallet()
  const { player } = usePlayerAuth()
  const [toast, setToast] = useState<string | null>(null)
  const [category, setCategory] = useState<S9Category>('love')
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(null)
  const [supportUnread, setSupportUnread] = useState(true)

  const showToast = (m: string) => {
    setToast(m)
    window.setTimeout(() => setToast(null), 2200)
  }

  const claimDaily = async () => {
    const res = await api.post('/bonuses/daily-open/claim') as { day?: number; amount?: number }
    await Promise.all([refresh(), notif.refetch()])
    const day = res?.day ?? ''
    const amt = res?.amount != null ? `Rs ${res.amount}` : 'bonus'
    showToast(day ? `Day ${day}: ${amt} claimed!` : 'Daily reward claimed!')
  }

  const spinWheelDone = async () => {
    await Promise.all([refresh(), notif.refetch()])
  }

  const [showAddCash, setShowAddCash] = useState(false)
  const [showBindAccount, setShowBindAccount] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showWheel, setShowWheel] = useState(false)
  const [showDepositWheel, setShowDepositWheel] = useState(false)
  const [showRefer, setShowRefer] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showAccountRecords, setShowAccountRecords] = useState(false)
  const [showNews, setShowNews] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [showMail, setShowMail] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showGrabBonus, setShowGrabBonus] = useState(false)
  const [showRebate, setShowRebate] = useState(false)
  const [showFreeCash, setShowFreeCash] = useState(false)
  const [showCashCards, setShowCashCards] = useState(false)
  const [depositPreset, setDepositPreset] = useState<number | undefined>(undefined)
  const [showVip, setShowVip] = useState(false)
  const [showReturnBonus, setShowReturnBonus] = useState(false)
  const [lobbyReady, setLobbyReady] = useState(false)
  const [lobbyProgress, setLobbyProgress] = useState(4)

  const openDeposit = (amount?: number) => {
    setDepositPreset(amount)
    setShowAddCash(true)
  }

  const openCashCards = () => setShowCashCards(true)

  useEffect(() => {
    let cancelled = false
    void ensureLobbyAssetsReady((pct) => {
      if (!cancelled) setLobbyProgress(pct)
    }).finally(() => {
      if (!cancelled) {
        setLobbyProgress(100)
        setLobbyReady(true)
        startLobbyAssetWarmup() // continue warming game packs in background
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (player?.id) setPayoutAccount(loadPayoutAccount(player.id))
  }, [player?.id])

  const openWithdraw = () => {
    if (!payoutAccount) setShowBindAccount(true)
    else setShowWithdraw(true)
  }

  const onAccountBound = (account: PayoutAccount) => {
    if (player?.id) savePayoutAccount(player.id, account)
    setPayoutAccount(account)
    setShowBindAccount(false)
    setShowWithdraw(true)
  }

  const openMail = () => {
    setSupportUnread(false)
    notif.markRead()
    setShowMail(true)
  }

  useEffect(() => {
    if (!lobbyReady || !player?.id) return
    let cancelled = false
    const key = `zee9:return-bonus:${player.id}`
    try {
      if (sessionStorage.getItem(key) === '1') return
    } catch {
      /* ignore */
    }
    api
      .get('/bonuses/return/status')
      .then((st: { eligible?: boolean }) => {
        if (cancelled || !st?.eligible) return
        setShowReturnBonus(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [lobbyReady, player?.id])

  useEffect(() => {
    try {
      if (sessionStorage.getItem(LUCKY_WHEEL_SESSION_KEY) === '1') return
    } catch {
      /* ignore */
    }
    if (showReturnBonus) return
    const timer = window.setTimeout(() => setShowWheel(true), 500)
    return () => window.clearTimeout(timer)
  }, [showReturnBonus])

  const closeWheel = () => {
    try {
      sessionStorage.setItem(LUCKY_WHEEL_SESSION_KEY, '1')
    } catch {
      /* ignore */
    }
    setShowWheel(false)
  }

  const openWheel = () => setShowWheel(true)

  if (!lobbyReady) {
    return (
      <div className={styles.lobby}>
        <Zee9LoadingScreen
          progress={lobbyProgress}
          title="Zee9"
          subtitle="Loading game tiles…"
        />
      </div>
    )
  }

  return (
    <div className={styles.lobby}>
      <div className={styles.pattern} aria-hidden="true" />
      <S9Header
        onDeposit={openDeposit}
        onProfile={() => {
          if (player?.referralAgentActive) {
            setShowAccountRecords(true)
            return
          }
          setShowProfile((v) => !v)
        }}
        onDailyBonus={() => setShowWelcome(true)}
        onVip={() => setShowVip(true)}
        onMail={openMail}
        onSettings={() => setShowSettings(true)}
        onSupport={() => setShowSupport(true)}
        onAgent={() => setShowRefer(true)}
        mailUnread={notif.unread > 0 || supportUnread}
      />
      <S9Ticker text={config?.tickerText} />
      <div className={styles.body}>
        <S9Sidebar
          active={category}
          onSelect={(c) => {
            setCategory(c)
            setShowProfile(false)
          }}
        />
        {showProfile ? (
          <UserProfileScreen
            onDeposit={openDeposit}
            onWithdraw={openWithdraw}
            onHistory={() => setShowHistory(true)}
            onBankDetails={() => setShowBindAccount(true)}
            onVip={() => setShowVip(true)}
          />
        ) : (
          <S9CategoryScreen
            key={category}
            category={category}
            onPlay={(id) => navigate(`/play/${id}`)}
            onClaimBonus={openDeposit}
            gridRef={gridRef}
          />
        )}
      </div>
      <S9BottomBar
        onDeposit={openDeposit}
        onWithdraw={openWithdraw}
        onWheel={openWheel}
        onRefer={() => setShowRefer(true)}
        onDailyBonus={() => setShowWelcome(true)}
        onBetWheel={() => setShowDepositWheel(true)}
        onRecharge={openCashCards}
        onCashback={() => setShowFreeCash(true)}
        isAgent={!!player?.referralAgentActive}
      />

      {showAddCash && (
        <AddCashModal
          key={depositPreset ?? 'default'}
          initialAmount={depositPreset}
          onClose={() => {
            setShowAddCash(false)
            setDepositPreset(undefined)
          }}
        />
      )}
      {showCashCards && (
        <CashBackCardsModal
          onClose={() => setShowCashCards(false)}
          onOtherChips={(amount) => {
            setShowCashCards(false)
            openDeposit(amount)
          }}
        />
      )}
      {showBindAccount && (
        <BindWithdrawModal
          onClose={() => setShowBindAccount(false)}
          onConfirm={onAccountBound}
          initial={payoutAccount}
        />
      )}
      {showWithdraw && payoutAccount && (
        <WithdrawScreen
          onClose={() => setShowWithdraw(false)}
          account={payoutAccount}
          onChangeAccount={() => { setShowWithdraw(false); setShowBindAccount(true) }}
          onSuccess={() => notif.refetch()}
        />
      )}
      {showWheel && (
        <LuckyWheelModal
          onClose={closeWheel}
          onSpinDone={spinWheelDone}
          onDeposit={() => {
            closeWheel()
            openDeposit()
          }}
        />
      )}
      {showDepositWheel && (
        <LuckyWheelModal
          variant="DEPOSIT"
          onClose={() => setShowDepositWheel(false)}
          onSpinDone={spinWheelDone}
          onDeposit={() => {
            setShowDepositWheel(false)
            openDeposit()
          }}
        />
      )}
      {showRefer && (
        <ReferEarnScreen
          onClose={() => setShowRefer(false)}
          onWithdraw={openWithdraw}
          onToast={showToast}
        />
      )}
      {showAccountRecords && (
        <AccountRecordsModal
          onClose={() => setShowAccountRecords(false)}
          onHistory={() => {
            setShowAccountRecords(false)
            setShowHistory(true)
          }}
          onVip={() => {
            setShowAccountRecords(false)
            setShowVip(true)
          }}
          onToast={showToast}
        />
      )}
      {showNews && (
        <NewsScreen
          onClose={() => setShowNews(false)}
          onClaim={() => {
            setShowNews(false)
            openDeposit()
          }}
        />
      )}
      {showSupport && (
        <SupportScreen
          onClose={() => setShowSupport(false)}
          onOpenNews={() => {
            setShowSupport(false)
            setShowNews(true)
          }}
        />
      )}
      {showMail && (
        <MailScreen
          onClose={() => setShowMail(false)}
          items={notif.items}
          onOpenDeposit={openDeposit}
          onOpenWithdraw={openWithdraw}
          onOpenWheel={openWheel}
          onOpenWelcome={() => setShowWelcome(true)}
        />
      )}
      {showSettings && (
        <SettingsScreen
          onClose={() => setShowSettings(false)}
          onToast={showToast}
        />
      )}
      {showWelcome && (
        <WelcomeBonusModal
          onClose={() => setShowWelcome(false)}
          onClaim={claimDaily}
        />
      )}
      {showHistory && <TransactionHistoryModal onClose={() => setShowHistory(false)} />}
      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: '#ffd54f', padding: '10px 20px', borderRadius: 24, fontWeight: 700, fontSize: 13, zIndex: 9999, border: '1px solid #8b6914' }}>
          {toast}
        </div>
      )}
      {showGrabBonus && (
        <GrabBonusModal
          onClose={() => setShowGrabBonus(false)}
          onClaim={claimDaily}
        />
      )}
      {showFreeCash && (
        <FreeCashModal
          onClose={() => setShowFreeCash(false)}
          onGoPlay={() => setShowFreeCash(false)}
          onGoDeposit={() => {
            setShowFreeCash(false)
            openCashCards()
          }}
          onOpenRebate={() => setShowRebate(true)}
        />
      )}
      {showRebate && (
        <RebateModal
          onClose={() => setShowRebate(false)}
          onGoPlay={() => setShowRebate(false)}
        />
      )}
      {showVip && (
        <VipSalaryModal
          onClose={() => setShowVip(false)}
          onDeposit={() => {
            setShowVip(false)
            openDeposit()
          }}
        />
      )}
      {showReturnBonus && (
        <ReturnBonusModal
          onClose={() => {
            try {
              if (player?.id) sessionStorage.setItem(`zee9:return-bonus:${player.id}`, '1')
            } catch {
              /* ignore */
            }
            setShowReturnBonus(false)
          }}
          onClaimed={(amount) => {
            showToast(`Welcome back! Rs ${amount} credited`)
            try {
              if (player?.id) sessionStorage.setItem(`zee9:return-bonus:${player.id}`, '1')
            } catch {
              /* ignore */
            }
          }}
        />
      )}
    </div>
  )
}
