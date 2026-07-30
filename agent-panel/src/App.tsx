import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './data/store'
import Home from './pages/Home'
import Downline from './pages/Downline'
import Commissions from './pages/Commissions'
import Profile from './pages/Profile'
import LoginPassword from './pages/LoginPassword'

export default function App() {
  const { toast } = useStore()
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/downline" element={<Downline />} />
        <Route path="/commissions" element={<Commissions />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login-password" element={<LoginPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
