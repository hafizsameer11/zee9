import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Games from './pages/Games'
import Players from './pages/Players'
import Agents from './pages/Agents'
import Referrals from './pages/Referrals'
import Deposits from './pages/Deposits'
import Withdrawals from './pages/Withdrawals'
import Bonuses from './pages/Bonuses'
import Cashback from './pages/Cashback'
import Offers from './pages/Offers'
import LuckyWheel from './pages/LuckyWheel'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/games" element={<Games />} />
        <Route path="/players" element={<Players />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/referrals" element={<Referrals />} />
        <Route path="/deposits" element={<Deposits />} />
        <Route path="/withdrawals" element={<Withdrawals />} />
        <Route path="/bonuses" element={<Bonuses />} />
        <Route path="/cashback" element={<Cashback />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/wheel" element={<LuckyWheel />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
