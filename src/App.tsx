import { Routes, Route, Navigate } from 'react-router-dom'
import LandscapeApp from './components/landscape/LandscapeApp'
import S9Lobby from './components/s9/S9Lobby'
import { WalletProvider } from './context/WalletContext'
import Splash from './pages/Splash'
import Login from './pages/Login'
import GamePlay from './pages/GamePlay'

export default function App() {
  return (
    <WalletProvider>
    <LandscapeApp>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<S9Lobby />} />
        <Route path="/play/:id" element={<GamePlay />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LandscapeApp>
    </WalletProvider>
  )
}
