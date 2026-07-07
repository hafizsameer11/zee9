import { useRef, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import { type S9Category } from '../../data/s9Games'

import S9Header from './S9Header'

import S9Ticker from './S9Ticker'

import S9Sidebar from './S9Sidebar'

import S9CategoryScreen from './S9CategoryScreen'

import S9BottomBar from './S9BottomBar'

import AddCashModal from './modals/AddCashModal'

import WithdrawPasswordModal from './modals/WithdrawPasswordModal'

import BindWithdrawModal from './modals/BindWithdrawModal'

import WithdrawScreen from './modals/WithdrawScreen'

import LuckyWheelModal from './modals/LuckyWheelModal'

import ReferEarnScreen from './modals/ReferEarnScreen'

import UserProfileScreen from './modals/UserProfileScreen'

import NewsScreen from './modals/NewsScreen'

import SupportScreen from './modals/SupportScreen'

import MailScreen from './modals/MailScreen'

import SettingsScreen from './modals/SettingsScreen'

import WelcomeBonusModal from './modals/WelcomeBonusModal'

import GrabBonusModal from './modals/GrabBonusModal'

import RebateModal from './modals/RebateModal'

import styles from './S9Lobby.module.css'



export default function S9Lobby() {

  const navigate = useNavigate()

  const gridRef = useRef<HTMLDivElement>(null)

  const [category, setCategory] = useState<S9Category>('hot')

  const [hasWithdrawPassword, setHasWithdrawPassword] = useState(false)

  const [hasBoundAccount, setHasBoundAccount] = useState(false)

  const [mailUnread, setMailUnread] = useState(true)



  const [showAddCash, setShowAddCash] = useState(false)

  const [showWithdrawPassword, setShowWithdrawPassword] = useState(false)

  const [showBindAccount, setShowBindAccount] = useState(false)

  const [showWithdraw, setShowWithdraw] = useState(false)

  const [showWheel, setShowWheel] = useState(false)

  const [showRefer, setShowRefer] = useState(false)

  const [showProfile, setShowProfile] = useState(false)

  const [showNews, setShowNews] = useState(false)

  const [showSupport, setShowSupport] = useState(false)

  const [showMail, setShowMail] = useState(false)

  const [showSettings, setShowSettings] = useState(false)

  const [showWelcome, setShowWelcome] = useState(false)

  const [showGrabBonus, setShowGrabBonus] = useState(false)

  const [showRebate, setShowRebate] = useState(false)



  const openDeposit = () => setShowAddCash(true)



  const openWithdraw = () => {

    if (!hasWithdrawPassword) setShowWithdrawPassword(true)

    else if (!hasBoundAccount) setShowBindAccount(true)

    else setShowWithdraw(true)

  }



  const onPasswordConfirmed = () => {

    setHasWithdrawPassword(true)

    setShowWithdrawPassword(false)

    setShowBindAccount(true)

  }



  const onAccountBound = () => {

    setHasBoundAccount(true)

    setShowBindAccount(false)

    setShowWithdraw(true)

  }



  const openMail = () => {

    setMailUnread(false)

    setShowMail(true)

  }



  const scrollToTop = () => {

    gridRef.current?.scrollTo({ top: 0, behavior: 'smooth' })

  }




  return (

    <div className={styles.lobby}>

      <div className={styles.pattern} aria-hidden="true" />

      <S9Header

        onDeposit={openDeposit}

        onWithdraw={openWithdraw}

        onProfile={() => setShowProfile((v) => !v)}

        onNews={() => setShowNews(true)}

        onSupport={() => setShowSupport(true)}

        onMail={openMail}

        onSettings={() => setShowSettings(true)}

        mailUnread={mailUnread}

      />

      <S9Ticker />

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
          />
        ) : (
          <S9CategoryScreen
            category={category}
            onPlay={(id) => navigate(`/play/${id}`)}
            gridRef={gridRef}
          />
        )}
      </div>

      <S9BottomBar

        onDeposit={openDeposit}

        onWheel={() => setShowWheel(true)}

        onRefer={() => setShowRefer(true)}

        onWelcome={() => setShowWelcome(true)}

        onGrabBonus={() => setShowGrabBonus(true)}

        onBetWheel={() => setShowWheel(true)}

        onRebate={() => setShowRebate(true)}

        onScrollTop={scrollToTop}

      />



      {showAddCash && <AddCashModal onClose={() => setShowAddCash(false)} />}

      {showWithdrawPassword && (

        <WithdrawPasswordModal

          onClose={() => setShowWithdrawPassword(false)}

          onConfirm={onPasswordConfirmed}

        />

      )}

      {showBindAccount && (

        <BindWithdrawModal

          onClose={() => setShowBindAccount(false)}

          onConfirm={onAccountBound}

        />

      )}

      {showWithdraw && <WithdrawScreen onClose={() => setShowWithdraw(false)} />}

      {showWheel && <LuckyWheelModal onClose={() => setShowWheel(false)} />}

      {showRefer && (

        <ReferEarnScreen

          onClose={() => setShowRefer(false)}

          onWithdraw={openWithdraw}

        />

      )}

      {showNews && <NewsScreen onClose={() => setShowNews(false)} />}

      {showSupport && <SupportScreen onClose={() => setShowSupport(false)} />}

      {showMail && <MailScreen onClose={() => setShowMail(false)} />}

      {showSettings && <SettingsScreen onClose={() => setShowSettings(false)} />}

      {showWelcome && (

        <WelcomeBonusModal

          onClose={() => setShowWelcome(false)}

          onClaim={openDeposit}

        />

      )}

      {showGrabBonus && <GrabBonusModal onClose={() => setShowGrabBonus(false)} />}

      {showRebate && <RebateModal onClose={() => setShowRebate(false)} />}

    </div>

  )

}


