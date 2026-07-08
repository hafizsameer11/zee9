import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { jobs } from '../data';
import { useToast } from '../components';

export default function JobDetail() {
  const { id } = useParams();
  const job = jobs.find(j => j.id === id) ?? jobs[0];
  const toast = useToast();
  const [bidding, setBidding] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <div className="page">
      <div className="split">
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: 19, color: 'var(--navy)', fontWeight: 800 }}>{job.title}</h2>
                <div className="jc-meta" style={{ marginTop: 5 }}>
                  <span>Posted {job.posted}</span>
                  <span>{job.bids} bids</span>
                  <span>{job.category}</span>
                </div>
              </div>
              <span className="matchscore" style={{ fontSize: 16 }}>{job.match}% match</span>
            </div>
            <div className="sec-t">Description</div>
            <p style={{ fontSize: 13.5, color: '#4a5365' }}>{job.desc}</p>
            <div className="sec-t">Deliverables — what "done" looks like</div>
            {job.deliverables.map(d => (
              <div key={d} className="listitem" style={{ padding: '8px 0' }}>
                <div className="li-t" style={{ fontWeight: 600 }}>✓ {d}</div>
              </div>
            ))}
            <div className="grid2" style={{ marginTop: 14 }}>
              <div className="stat"><div className="v" style={{ fontSize: 16 }}>{job.revisions} rounds</div><div className="l">Revisions included — extras are a new milestone</div></div>
              <div className="stat"><div className="v" style={{ fontSize: 16 }}>{job.timeline}</div><div className="l">Timeline</div></div>
            </div>
            <div className="sec-t">Skills</div>
            <div className="chiprow">{job.skills.map(s => <span key={s} className="chip">{s}</span>)}</div>
          </div>

          {bidding && !sent && (
            <div className="card" style={{ marginTop: 14 }}>
              <div className="sec-t" style={{ marginTop: 0 }}>Your proposal</div>
              <div className="grid2">
                <div className="field"><label>Your bid (total)</label><input className="input" placeholder="$ 950" defaultValue="$950" /></div>
                <div className="field"><label>Delivery time</label><input className="input" defaultValue="2.5 weeks" /></div>
              </div>
              <div className="field">
                <label>Cover note</label>
                <textarea className="input" defaultValue="I've built 40+ Shopify stores for skincare and beauty brands. I can have your 5 pages live in 2 weeks, with the catalogue structured for easy scaling past 30 products." />
                <div className="hint">The Guardian checks proposals for scope mismatches before they're sent — you'll be warned if your bid doesn't cover all deliverables.</div>
              </div>
              <div className="rrow"><span className="muted">Your bid</span><span>$950.00</span></div>
              <div className="rrow"><span className="muted">Trove fee (4%, charged only on completion)</span><span>−$38.00</span></div>
              <div className="rrow total" style={{ color: 'var(--green)' }}><span>You'd receive</span><span>$912.00</span></div>
              <button className="pill-btn gold" style={{ width: '100%', marginTop: 14, padding: 11 }} onClick={() => { setSent(true); toast('Proposal sent — uses 1 bid'); }}>
                Send proposal (uses 1 bid)
              </button>
            </div>
          )}
          {sent && (
            <div className="notice ok" style={{ marginTop: 14 }}>
              <span>✅</span>
              <span>Proposal sent! You'll be notified when the client shortlists or messages you. Track it under <Link to="/dashboard">My bids</Link>.</span>
            </div>
          )}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>{job.budget}</div>
            <div className="muted" style={{ fontSize: 12 }}>{job.type} price · escrow protected</div>
            {!sent && !bidding && (
              <button className="pill-btn gold" style={{ width: '100%', marginTop: 14, padding: 11 }} onClick={() => setBidding(true)}>Place a bid</button>
            )}
            <div className="escrow-note"><span>🔒</span><span>Client funds escrow before work starts. You get paid when work is approved — guaranteed.</span></div>
          </div>
          <div className="card">
            <span className="label-sm">About the client</span>
            <div style={{ marginTop: 9, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {job.clientVerified ? <span className="badge b-verified">✓ Verified client</span> : <span className="badge b-grey">Unverified</span>}
              {job.clientRating > 0 && <span className="badge b-preferred">★ {job.clientRating.toFixed(1)} rating</span>}
            </div>
            <div className="listitem" style={{ marginTop: 8 }}><span className="li-s">Jobs posted</span><span className="li-t">7</span></div>
            <div className="listitem"><span className="li-s">Hire rate</span><span className="li-t">86%</span></div>
            <div className="listitem"><span className="li-s">Escrow funded on past jobs</span><span className="li-t">100%</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
