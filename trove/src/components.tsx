import { createContext, useContext, useState, ReactNode } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';

/* ---------- role context (demo: switch between freelancer & client view) ---------- */
type Role = 'freelancer' | 'client';
const RoleCtx = createContext<{ role: Role; setRole: (r: Role) => void }>({ role: 'freelancer', setRole: () => {} });
export const useRole = () => useContext(RoleCtx);

/* ---------- toast ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function AppProviders({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('freelancer');
  const [toast, setToast] = useState<string | null>(null);
  const show = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };
  return (
    <RoleCtx.Provider value={{ role, setRole }}>
      <ToastCtx.Provider value={show}>
        {children}
        {toast && <div className="toast">{toast}</div>}
      </ToastCtx.Provider>
    </RoleCtx.Provider>
  );
}

/* ---------- top navigation ---------- */
export function AppNav() {
  const { role, setRole } = useRole();
  const navigate = useNavigate();
  const links = role === 'freelancer'
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/jobs', label: 'Find work' },
        { to: '/contracts', label: 'Contracts' },
        { to: '/messages', label: 'Messages' },
        { to: '/wallet', label: 'Wallet' },
      ]
    : [
        { to: '/client', label: 'Dashboard' },
        { to: '/talent', label: 'Find talent' },
        { to: '/post-job', label: 'Post a job' },
        { to: '/contracts', label: 'Contracts' },
        { to: '/messages', label: 'Messages' },
      ];
  return (
    <nav className="appnav">
      <div className="left">
        <Link to="/" className="logo"><span className="mark">T</span>Trove</Link>
        <div className="links">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>{l.label}</NavLink>
          ))}
        </div>
      </div>
      <div className="right">
        <div className="role-switch" title="Demo: switch perspective">
          <button className={role === 'freelancer' ? 'on' : ''} onClick={() => { setRole('freelancer'); navigate('/dashboard'); }}>Freelancer</button>
          <button className={role === 'client' ? 'on' : ''} onClick={() => { setRole('client'); navigate('/client'); }}>Client</button>
        </div>
        {role === 'freelancer'
          ? <span className="badge b-preferred">★ Preferred</span>
          : <span className="badge b-verified">✓ Verified client</span>}
        <div className="avatar">{role === 'freelancer' ? 'JD' : 'AC'}</div>
      </div>
    </nav>
  );
}

/* ---------- small bits ---------- */
export function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="stepbar">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`s ${i < step - 1 ? 'done' : i === step - 1 ? 'now' : ''}`} />
      ))}
    </div>
  );
}

export function Stars({ n }: { n: number }) {
  return <span style={{ color: '#e8a814', letterSpacing: 1 }}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="inner">
        <div>
          <div className="fbrand">T R O V E</div>
          <div style={{ marginTop: 8 }}>Hire talent you can trust. Fair fees, real protection.</div>
        </div>
        <div style={{ display: 'flex', gap: 34, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: 6 }}>Platform</div>
            <div><Link to="/jobs">Find work</Link></div>
            <div><Link to="/talent">Find talent</Link></div>
            <div><Link to="/how-it-works">Pricing</Link></div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: 6 }}>Trust</div>
            <div><Link to="/how-it-works">Escrow &amp; guarantee</Link></div>
            <div><Link to="/how-it-works">AI Guardian</Link></div>
          </div>
        </div>
        <div style={{ alignSelf: 'flex-end' }}>© 2026 Trove. All rights reserved.</div>
      </div>
    </footer>
  );
}
