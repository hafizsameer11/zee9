import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './data/store'
import Home from './pages/Home'
import Members from './pages/Members'
import Reports from './pages/Reports'
import Commissions from './pages/Commissions'
import Profile from './pages/Profile'
import LoginPassword from './pages/LoginPassword'

export default function App() {
  const { toast } = useStore()
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/members" element={<Members />} />
        <Route path="/agents" element={<Members agentsOnly />} />
        <Route path="/reports/:kind" element={<Reports />} />
        <Route path="/commissions" element={<Commissions />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login-password" element={<LoginPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
