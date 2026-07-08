import { useState } from 'react';
import { Link } from 'react-router-dom';
import { freelancers } from '../data';

export default function FindTalent() {
  const [q, setQ] = useState('');
  const [newOnly, setNewOnly] = useState(false);
  const filtered = freelancers.filter(f =>
    (!newOnly || f.newTalent) &&
    (q === '' || (f.name + f.title + f.skills.join(' ')).toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Find talent</h2>
          <p className="page-sub">Verified freelancers with real, portable reputations.</p>
        </div>
        <Link to="/post-job" className="pill-btn gold">+ Post a job instead</Link>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" placeholder="Search by skill, name, title…" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--navy)', fontWeight: 600, cursor: 'pointer' }}>
          <input type="checkbox" checked={newOnly} onChange={e => setNewOnly(e.target.checked)} />
          🌱 Give new talent a shot
        </label>
      </div>

      {filtered.map(f => (
        <div key={f.id} className="appcard">
          <div className="av">{f.initials}</div>
          <div className="info">
            <div className="nm">
              <Link to={`/f/${f.id}`} style={{ color: 'var(--navy)' }}>{f.name}</Link>
              {f.verified && <span className="badge b-verified">✓ Verified</span>}
              {f.preferred && <span className="badge b-preferred">★ Preferred</span>}
              {f.newTalent && <span className="badge b-new">🌱 New talent</span>}
            </div>
            <div className="meta">{f.title} · {f.location} · from ${f.rate}/hr</div>
            <div className="meta">
              {f.newTalent ? 'New to Trove — imported portfolio available' : `⭐ ${f.rating} (${f.reviews} reviews) · ${f.success}% success · ${f.jobsDone} jobs done`}
            </div>
            <div className="chiprow" style={{ marginTop: 7 }}>
              {f.skills.slice(0, 5).map(s => <span key={s} className="chip">{s}</span>)}
            </div>
          </div>
          <div className="acts">
            <Link to={`/f/${f.id}`} className="mini p" style={{ textAlign: 'center', textDecoration: 'none' }}>View profile</Link>
            <Link to="/messages" className="mini g" style={{ textAlign: 'center', textDecoration: 'none' }}>Message</Link>
          </div>
        </div>
      ))}
      {filtered.length === 0 && <div className="empty">No freelancers match. Try different keywords.</div>}
    </div>
  );
}
