import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AdminStoreProvider } from './data/store'
import './styles/admin.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AdminStoreProvider>
        <App />
      </AdminStoreProvider>
    </HashRouter>
  </React.StrictMode>,
)
