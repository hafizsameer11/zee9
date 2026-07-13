import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import Login from './pages/Login'
import { AdminStoreProvider } from './data/store'
import { AuthProvider, useAuth } from './api/auth'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/admin.css'

function Gate() {
  const { admin, ready } = useAuth()
  if (!ready)
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: '#8a8aa3' }}>Loading…</div>
    )
  if (!admin) return <Login />
  return (
    <ErrorBoundary>
      <AdminStoreProvider>
        <App />
      </AdminStoreProvider>
    </ErrorBoundary>
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
