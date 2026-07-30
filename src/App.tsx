import { Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import LandscapeApp from './components/landscape/LandscapeApp'
import S9Lobby from './components/s9/S9Lobby'
import { WalletProvider } from './context/WalletContext'
import { AuthProvider, usePlayerAuth } from './api/auth'
import { SoundProvider } from './lib/sound'
import Splash from './pages/Splash'
import Login from './pages/Login'
import GamePlay from './pages/GamePlay'
import C2cPaymentPage from './pages/C2cPaymentPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const { player, ready } = usePlayerAuth()
  if (!ready) return null
  if (!player) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <SoundProvider>
        <WalletProvider>
          <LandscapeApp>
            <Routes>
              <Route path="/" element={<Splash />} />
              <Route path="/login" element={<Login />} />
              <Route path="/home" element={<RequireAuth><S9Lobby /></RequireAuth>} />
              <Route path="/play/:id" element={<RequireAuth><GamePlay /></RequireAuth>} />
              <Route path="/preview/:id" element={<GamePlay />} />
              <Route path="/pay/:orderNo" element={<RequireAuth><C2cPaymentPage /></RequireAuth>} />
              <Route path="/payment" element={<RequireAuth><C2cPaymentPage /></RequireAuth>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LandscapeApp>
        </WalletProvider>
      </SoundProvider>
    </AuthProvider>
  )
}
