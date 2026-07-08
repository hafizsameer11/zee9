import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './data/store'
import Home from './pages/Home'
import Profile from './pages/Profile'
import LoginPassword from './pages/LoginPassword'
import AccountManagement from './pages/AccountManagement'
import AddAccount from './pages/AddAccount'
import Collections from './pages/Collections'
import OrderList from './pages/OrderList'
import OrderPayment from './pages/OrderPayment'
import PayOnBehalf from './pages/PayOnBehalf'
import PaymentInformation from './pages/PaymentInformation'
import Balance from './pages/Balance'

export default function App() {
  const { toast } = useStore()
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
        <Route path="/payment-info" element={<PaymentInformation />} />
        <Route path="/balance" element={<Balance />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
