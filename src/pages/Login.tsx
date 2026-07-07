import { useNavigate } from 'react-router-dom'
import styles from './Login.module.css'

export default function Login() {
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <h1>Zee9 Login</h1>
      <input type="tel" placeholder="Phone" />
      <input type="password" placeholder="Password" />
      <button type="button" onClick={() => navigate('/home')}>Login</button>
      <button type="button" className={styles.skip} onClick={() => navigate('/home')}>Skip</button>
    </div>
  )
}
