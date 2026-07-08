import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRole } from '../components';

export function Login() {
  const navigate = useNavigate();
  const { setRole } = useRole();
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Welcome back</h2>
        <p className="sub">Log in to your Trove account</p>
        <div className="field"><label>Email</label><input className="input" type="email" placeholder="you@example.com" /></div>
        <div className="field"><label>Password</label><input className="input" type="password" placeholder="••••••••" /></div>
        <button className="pill-btn" style={{ width: '100%', padding: 11 }} onClick={() => { setRole('freelancer'); navigate('/dashboard'); }}>Log in</button>
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 14 }}>
          New to Trove? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export function Signup() {
  const navigate = useNavigate();
  const { setRole } = useRole();
  const [who, setWho] = useState<'freelancer' | 'client'>('freelancer');
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Join Trove</h2>
        <p className="sub">Free to join. No subscription for freelancers for 6 months.</p>
        <div className="field">
          <label>I want to…</label>
          <div className="radio-row">
            <button className={`radio-card ${who === 'freelancer' ? 'sel' : ''}`} onClick={() => setWho('freelancer')}>
              <div className="rc-t">Work as a freelancer</div>
              <div className="rc-s">Find jobs, keep 96% of what you earn</div>
            </button>
            <button className={`radio-card ${who === 'client' ? 'sel' : ''}`} onClick={() => setWho('client')}>
              <div className="rc-t">Hire for a project</div>
              <div className="rc-s">Post free, protected by escrow</div>
            </button>
          </div>
        </div>
        <div className="field"><label>Full name</label><input className="input" placeholder="Jane Doe" /></div>
        <div className="field"><label>Email</label><input className="input" type="email" placeholder="you@example.com" /></div>
        <div className="field"><label>Password</label><input className="input" type="password" placeholder="8+ characters" /></div>
        <button
          className="pill-btn gold" style={{ width: '100%', padding: 11 }}
          onClick={() => {
            setRole(who);
            navigate(who === 'freelancer' ? '/onboarding' : '/post-job');
          }}
        >
          Create account
        </button>
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 14 }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
