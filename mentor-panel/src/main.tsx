import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import Login from './pages/Login'
import { StoreProvider } from './data/store'
import { AuthProvider, useAuth } from './api/auth'
import './styles/theme.css'

function Gate() {
  const { mentor, ready } = useAuth()
  if (!ready)
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: '#fff', background: '#1e3a5f' }}>
        Loading…
      </div>
    )
  if (!mentor) return <Login />
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
