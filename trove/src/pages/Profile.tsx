import { Link, useParams } from 'react-router-dom';
import { freelancers } from '../data';
import { Stars, useToast } from '../components';

export default function Profile() {
  const { id } = useParams();
  const f = freelancers.find(x => x.id === id) ?? freelancers[0];
  const toast = useToast();
  return (
    <div className="page mid">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div className="prof-head" style={{ flex: 1 }}>
            <div className="pic">{f.initials}</div>
            <div style={{ flex: 1 }}>
              <div className="nm">{f.name}</div>
              <div className="ttl">{f.title}</div>
              <div style={{ marginTop: 7, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {f.verified && <span className="badge b-verified">✓ Verified</span>}
                {f.preferred && <span className="badge b-preferred">★ Preferred</span>}
                {f.newTalent && <span className="badge b-new">🌱 New talent</span>}
                <span className="badge b-grey">📍 {f.location}</span>
              </div>
              {!f.newTalent && (
                <div className="prof-stats">
                  <span><b>{f.rating}★</b> rating</span>
                  <span><b>{f.reviews}</b> reviews</span>
                  <span><b>{f.success}%</b> success</span>
                  <span><b>{f.jobsDone}</b> jobs done</span>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <button className="pill-btn ghost" onClick={() => toast('Saved to your talent list')}>♡ Save</button>
            <Link to="/messages" className="pill-btn">Message</Link>
          </div>
        </div>

        <div className="sec-t">About</div>
        <p style={{ fontSize: 13, color: '#4a5365' }}>{f.about}</p>

        <div className="sec-t">Skills</div>
        <div className="chiprow">{f.skills.map(s => <span key={s} className="chip">{s}</span>)}</div>

        <div className="sec-t">Portfolio</div>
        <div className="portfolio">{f.portfolio.map(p => <div key={p} className="p">{p}</div>)}</div>

        <div className="sec-t">Service packages</div>
        <div className="grid2">
          {f.packages.map(p => (
            <div key={p.title} className="pkg">
              <div className="pk-t">{p.title}</div>
              <div className="muted" style={{ margin: '3px 0' }}>{p.desc}</div>
              <div className="pk-p">from ${p.from}</div>
            </div>
          ))}
        </div>

        <div className="sec-t">Reviews</div>
        {f.reviewsList.length === 0 && (
          <div className="notice">
            <span>🌱</span>
            <span>No Trove reviews yet — {f.name.split(' ')[0]} joined recently. Imported portfolio and external references are available on request.</span>
          </div>
        )}
        {f.reviewsList.map(r => (
          <div key={r.project} className="review">
            <div className="r-h"><span>{r.project} — {r.client}</span><Stars n={r.stars} /></div>
            <div className="r-b">{r.text}</div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{r.date} · <button className="linklike" style={{ fontSize: 11.5 }} onClick={() => toast('Appeal filed — $5 held, refunded if the appeal succeeds')}>Appeal this review ($5)</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}
