import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Games from './pages/Games'
import Players from './pages/Players'
import UserDetail from './pages/UserDetail'
import C2cMerchants from './pages/C2cMerchants'
import ReferralAgents from './pages/ReferralAgents'
import Referrals from './pages/Referrals'
import Channels from './pages/Channels'
import Deposits from './pages/Deposits'
import PaymentChannels from './pages/PaymentChannels'
import Withdrawals from './pages/Withdrawals'
import Bonuses from './pages/Bonuses'
import Cashback from './pages/Cashback'
import Offers from './pages/Offers'
import LuckyWheel from './pages/LuckyWheel'
import Settings from './pages/Settings'
import Vip from './pages/Vip'
import FreeCash from './pages/FreeCash'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/games" element={<Games />} />
        <Route path="/players" element={<Players />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="/c2c" element={<C2cMerchants />} />
        <Route path="/agents" element={<ReferralAgents />} />
        <Route path="/referrals" element={<Referrals />} />
        <Route path="/channels" element={<Channels />} />
        <Route path="/deposits" element={<Deposits />} />
        <Route path="/payment-channels" element={<PaymentChannels />} />
        <Route path="/withdrawals" element={<Withdrawals />} />
        <Route path="/bonuses" element={<Bonuses />} />
        <Route path="/vip" element={<Vip />} />
        <Route path="/free-cash" element={<FreeCash />} />
        <Route path="/cashback" element={<Cashback />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/wheel" element={<LuckyWheel />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
