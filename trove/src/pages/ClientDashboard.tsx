import { Link } from 'react-router-dom';

export default function ClientDashboard() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Welcome back, Aurelia Skincare</h2>
          <p className="page-sub">Your projects, applicants, and escrow at a glance.</p>
        </div>
        <Link to="/post-job" className="pill-btn gold">+ Post a job</Link>
      </div>

      <div className="statrow">
        <div className="stat"><div className="v">2</div><div className="l">Active contracts</div></div>
        <div className="stat"><div className="v">$980</div><div className="l">Held in escrow</div></div>
        <div className="stat"><div className="v">12</div><div className="l">New applicants</div></div>
        <div className="stat"><div className="v gold">4.8 ★</div><div className="l">Your client rating</div></div>
      </div>

      <div className="split">
        <div>
          <div className="card">
            <span className="label-sm">Your job posts</span>
            <div className="listitem">
              <div>
                <div className="li-t">Shopify store build for skincare brand</div>
                <div className="li-s">$800–1,200 · posted 2h ago · 12 applicants</div>
              </div>
              <Link to="/jobs/shopify-build/applicants" className="mini p" style={{ textDecoration: 'none' }}>Review applicants</Link>
            </div>
            <div className="listitem">
              <div>
                <div className="li-t">Product photography retouching</div>
                <div className="li-s">Draft · not published yet</div>
              </div>
              <Link to="/post-job" className="mini g" style={{ textDecoration: 'none' }}>Continue draft</Link>
            </div>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <span className="label-sm">Active contracts</span>
            <Link to="/contracts/aurelia-build" className="listitem" style={{ color: 'inherit' }}>
              <div><div className="li-t">Shopify store build — Jane Doe</div><div className="li-s">Milestone 2 of 3 · due in 4 days</div></div>
              <span className="matchscore">On track</span>
            </Link>
            <div className="listitem">
              <div><div className="li-t">Milestone 1 — Homepage &amp; catalogue</div><div className="li-s">Delivered &amp; approved · $800 released</div></div>
              <span className="badge b-guar">✓ Released</span>
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <span className="label-sm">Escrow</span>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', margin: '6px 0 4px' }}>$980.00</div>
            <div className="muted" style={{ fontSize: 12 }}>held safely across 2 milestones</div>
            <Link to="/contracts/aurelia-build/fund" className="pill-btn" style={{ width: '100%', marginTop: 12 }}>Fund next milestone</Link>
          </div>
          <div className="notice ok" style={{ marginBottom: 14 }}>
            <span>🔒</span>
            <span>Escrow releases only when you approve the work — backed by the Trove guarantee.</span>
          </div>
          <div className="card">
            <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 8 }}>
              <div className="msg" style={{ margin: 0 }}><div className="ava ai" style={{ margin: 0 }}>🛡</div></div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 13.5 }}>Trove Guardian</div>
                <div className="muted" style={{ fontSize: 11.5 }}>Watching over your projects</div>
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: '#4a5365' }}>3 of your 12 applicants are Preferred freelancers with 95%+ success. Want me to shortlist them?</div>
            <Link to="/jobs/shopify-build/applicants" className="pill-btn ghost" style={{ width: '100%', marginTop: 10, fontSize: 12 }}>Review applicants</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
