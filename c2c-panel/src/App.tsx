import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './data/store'
import { unlockAlertSound } from './api/alertSound'
import DepositAlertModal from './components/DepositAlertModal'
import Home from './pages/Home'
import Profile from './pages/Profile'
import LoginPassword from './pages/LoginPassword'
import AccountManagement from './pages/AccountManagement'
import AddAccount from './pages/AddAccount'
import Collections from './pages/Collections'
import OrderList from './pages/OrderList'
import OrderPayment from './pages/OrderPayment'
import PayOnBehalf from './pages/PayOnBehalf'
import WithdrawHistory from './pages/WithdrawHistory'
import PaymentInformation from './pages/PaymentInformation'
import Balance from './pages/Balance'

export default function App() {
  const { toast, depositAlert, snoozeDepositAlert, openDepositAlert } = useStore()

  useEffect(() => {
    const unlock = () => {
      unlockAlertSound()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login-password" element={<LoginPassword />} />
        <Route path="/accounts" element={<AccountManagement />} />
        <Route path="/accounts/add" element={<AddAccount />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/orders" element={<OrderList />} />
        <Route path="/order/:id" element={<OrderPayment />} />
        <Route path="/pay-on-behalf" element={<PayOnBehalf />} />
        <Route path="/withdraw-history" element={<WithdrawHistory />} />
        <Route path="/payment-info" element={<PaymentInformation />} />
        <Route path="/balance" element={<Balance />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {toast && <div className="toast">{toast}</div>}
      {depositAlert && (
        <DepositAlertModal
          alert={depositAlert}
          onLater={snoozeDepositAlert}
          onOpen={openDepositAlert}
        />
      )}
    </>
  )
}
