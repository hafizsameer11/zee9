import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import Login from './pages/Login'
import { StoreProvider } from './data/store'
import { AuthProvider, useAuth } from './api/auth'
import './styles/theme.css'

function Gate() {
  const { agent, ready } = useAuth()
  if (!ready) return <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: '#fff', background: '#6c6be6' }}>Loading…</div>
  if (!agent) return <Login />
  return (
    <StoreProvider>
      <App />
    </StoreProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
)
