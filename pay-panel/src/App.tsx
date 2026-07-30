import { Navigate, Route, Routes } from 'react-router-dom'
import PaymentPage from './pages/PaymentPage'

export default function App() {
  return (
    <Routes>
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="/pay/:orderNo" element={<PaymentPage />} />
      <Route path="*" element={<Navigate to="/payment" replace />} />
    </Routes>
  )
}
