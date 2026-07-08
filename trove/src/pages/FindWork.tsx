import { useState } from 'react';
import { Link } from 'react-router-dom';
import { jobs, categories } from '../data';

export default function FindWork() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const filtered = jobs.filter(j =>
    (cat === 'All' || j.category === cat) &&
    (q === '' || (j.title + j.desc + j.skills.join(' ')).toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Find work</h2>
          <p className="page-sub">Jobs matched to your skills, ranked by fit — not by who bids most.</p>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>Bids remaining: <b style={{ color: 'var(--navy)' }}>142</b></span>
      </div>

      <div className="split">
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input className="input" placeholder="Search jobs, skills…" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1 }} />
            <select className="input" style={{ width: 'auto' }} value={cat} onChange={e => setCat(e.target.value)}>
              <option>All</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {filtered.map(j => (
            <Link key={j.id} to={`/jobs/${j.id}`} className="jobcard">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div className="jc-t">{j.title}</div>
                <span className="matchscore">{j.match}% match</span>
              </div>
              <div className="jc-meta">
                <span><b style={{ color: 'var(--navy)' }}>{j.budget}</b> · {j.type}</span>
                <span>{j.posted}</span>
                <span>{j.bids} bids</span>
                {j.clientVerified ? <span className="badge b-verified">✓ Verified client</span> : <span className="badge b-grey">New client</span>}
              </div>
              <div className="jc-desc">{j.desc.slice(0, 150)}…</div>
              <div className="chiprow" style={{ marginTop: 9 }}>
                {j.skills.map(s => <span key={s} className="chip">{s}</span>)}
              </div>
            </Link>
          ))}
          {filtered.length === 0 && <div className="empty">No jobs match your search. Try a broader term.</div>}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <span className="label-sm">Why match scores?</span>
            <p style={{ fontSize: 12.5, color: '#4a5365', marginTop: 8 }}>
              Match % compares the job's required skills, budget, and history with your profile. High matches convert to hires 4× more often — spend your bids where they count.
            </p>
          </div>
          <div className="notice warn">
            <span>⚠️</span>
            <span>Never take payment off-platform. You lose escrow protection and the Trove guarantee — the Guardian flags these attempts automatically.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
