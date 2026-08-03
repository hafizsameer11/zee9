import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useStore } from './data/store'
import DepositAlertModal from './components/DepositAlertModal'
import WithdrawAlertModal from './components/WithdrawAlertModal'
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
  const location = useLocation()
  const {
    toast,
    depositAlert,
    snoozeDepositAlert,
    rejectDepositAlert,
    openDepositAlert,
    withdrawAlert,
    snoozeWithdrawAlert,
    openWithdrawAlert,
  } = useStore()

  const onHome = location.pathname === '/'
  const showDepositAlert =
    depositAlert &&
    (depositAlert.type !== 'deposit_submitted' || onHome)
  const showWithdrawAlert = !showDepositAlert && withdrawAlert

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
      {showDepositAlert && (
        <DepositAlertModal
          alert={depositAlert}
          onLater={snoozeDepositAlert}
          onReject={() => void rejectDepositAlert()}
          onOpen={openDepositAlert}
        />
      )}
      {showWithdrawAlert && (
        <WithdrawAlertModal
          alert={withdrawAlert}
          onLater={snoozeWithdrawAlert}
          onOpen={openWithdrawAlert}
        />
      )}
    </>
  )
}
