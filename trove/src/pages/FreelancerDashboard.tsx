import { Link } from 'react-router-dom';
import { jobs } from '../data';

export default function FreelancerDashboard() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Welcome back, Jane</h2>
          <p className="page-sub">Here's what's moving on your work today.</p>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>Bids this month: <b style={{ color: 'var(--navy)' }}>208 of 350</b></span>
      </div>

      <div className="statrow">
        <div className="stat"><div className="v green">$1,240</div><div className="l">Available balance</div></div>
        <div className="stat"><div className="v">$4,820</div><div className="l">Earned this month</div></div>
        <div className="stat"><div className="v">4.9 ★</div><div className="l">Rating · 37 reviews</div></div>
        <div className="stat"><div className="v gold">98%</div><div className="l">Job success</div></div>
      </div>

      <div className="split">
        <div>
          <div className="card">
            <span className="label-sm">Active contracts</span>
            <Link to="/contracts/aurelia-build" className="listitem" style={{ color: 'inherit' }}>
              <div><div className="li-t">Shopify store build — Aurelia Skincare</div><div className="li-s">Milestone 2 of 3 · due in 4 days</div></div>
              <span className="matchscore">In progress</span>
            </Link>
            <Link to="/contracts/northwind-cro" className="listitem" style={{ color: 'inherit' }}>
              <div><div className="li-t">CRO audit — Northwind Co.</div><div className="li-s">Awaiting client approval</div></div>
              <span style={{ fontSize: 12, color: '#9a6f08', fontWeight: 700 }}>Submitted</span>
            </Link>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label-sm">Matched jobs for you</span>
              <Link to="/jobs" style={{ fontSize: 12.5, fontWeight: 600 }}>Browse all →</Link>
            </div>
            {jobs.slice(1, 4).map(j => (
              <Link key={j.id} to={`/jobs/${j.id}`} className="listitem" style={{ color: 'inherit' }}>
                <div>
                  <div className="li-t">{j.title}</div>
                  <div className="li-s">{j.budget} · {j.clientVerified ? 'Verified client' : 'New client'} · {j.bids} bids</div>
                </div>
                <span className="matchscore">{j.match}%</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <span className="label-sm">Withdraw</span>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', margin: '6px 0 10px' }}>$1,240.00</div>
            <Link to="/wallet" className="pill-btn" style={{ width: '100%', marginBottom: 7 }}>Withdraw to bank</Link>
            <Link to="/wallet" className="pill-btn ghost" style={{ width: '100%' }}>Instant payout (free on Elite)</Link>
          </div>
          <div className="card" style={{ marginBottom: 14 }}>
            <span className="label-sm">Progress to next tier</span>
            <div style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 600, marginTop: 6 }}>3% fee → 2.5% fee (Elite)</div>
            <div className="progress"><div className="fill" style={{ width: '72%' }} /></div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>8 more completed jobs to unlock Elite benefits</div>
          </div>
          <div className="card">
            <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 8 }}>
              <div className="msg" style={{ margin: 0 }}><div className="ava ai" style={{ margin: 0 }}>🛡</div></div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 13.5 }}>Trove Guardian</div>
                <div className="muted" style={{ fontSize: 11.5 }}>Watching over your jobs</div>
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: '#4a5365' }}>Milestone 2 for Aurelia is due in 4 days. Want help drafting a progress update for the client?</div>
            <Link to="/messages" className="pill-btn ghost" style={{ width: '100%', marginTop: 10, fontSize: 12 }}>Open Guardian chat</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
