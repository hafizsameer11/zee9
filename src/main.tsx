import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { captureReferral } from './api/referral'
import './index.css'
import './styles/premium.css'
import './styles/mobile.css'

// Capture channel/referral params from the share URL before anything navigates.
captureReferral()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
