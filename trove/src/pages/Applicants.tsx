import { useState } from 'react';
import { Link } from 'react-router-dom';
import { freelancers } from '../data';
import { useToast } from '../components';

const pitches: Record<string, string> = {
  'jane-doe': '"I\'ve built 40+ Shopify stores for skincare and beauty brands. I can have your 5 pages live in 2 weeks…"',
  'sam-khoza': '"Shopify Plus specialist. I\'d start with your product catalogue structure, then…"',
  'priya-m': '"New here but not new to Shopify — 6 years agency experience. Here\'s my portfolio…"',
  'liam-osei': '"I can pair the store build with a lightweight CRO pass so it converts from day one…"',
};

export default function Applicants() {
  const toast = useToast();
  const [shortlist, setShortlist] = useState<string[]>([]);
  return (
    <div className="page mid">
      <div className="page-head">
        <div>
          <h2 className="page-title">12 applicants</h2>
          <p className="page-sub">Shopify store build · $800–1,200 · ranked by match, spam filtered out</p>
        </div>
        <select className="input" style={{ width: 'auto' }}>
          <option>Sort: Best match</option>
          <option>Sort: Lowest bid</option>
          <option>Sort: Most reviews</option>
        </select>
      </div>

      <div className="notice" style={{ marginBottom: 16 }}>
        <span>🛡️</span>
        <span><b>Guardian note:</b> 4 proposals were filtered as copy-paste spam and aren't shown. 3 applicants below are Preferred freelancers with 95%+ success.</span>
      </div>

      {freelancers.map((f, i) => (
        <div key={f.id} className={`appcard ${i === 0 ? 'feat' : ''}`}>
          <div className="av">{f.initials}</div>
          <div className="info">
            <div className="nm">
              <Link to={`/f/${f.id}`} style={{ color: 'var(--navy)' }}>{f.name}</Link>
              {f.verified && <span className="badge b-verified">✓ Verified</span>}
              {f.preferred && <span className="badge b-preferred">★ Preferred</span>}
              {f.newTalent && <span className="badge b-new">🌱 New talent</span>}
            </div>
            <div className="meta">
              {f.newTalent
                ? `⭐ New to Trove · Strong portfolio · ${f.location} · from $${f.rate}/hr`
                : `⭐ ${f.rating} (${f.reviews}) · ${f.success}% job success · ${f.location} · from $${f.rate}/hr`}
            </div>
            <div className="pitch">{pitches[f.id]}</div>
          </div>
          <div className="acts">
            {shortlist.includes(f.id)
              ? <button className="mini g" onClick={() => setShortlist(shortlist.filter(x => x !== f.id))}>✓ Shortlisted</button>
              : <button className="mini p" onClick={() => { setShortlist([...shortlist, f.id]); toast(`${f.name} shortlisted`); }}>Shortlist</button>}
            <Link to="/messages" className="mini g" style={{ textAlign: 'center', textDecoration: 'none' }}>Message</Link>
          </div>
        </div>
      ))}

      {shortlist.length > 0 && (
        <div className="card" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>{shortlist.length} shortlisted</div>
            <div className="muted" style={{ fontSize: 12 }}>Ready to hire? You'll fund escrow next — money releases only on your approval.</div>
          </div>
          <Link to="/contracts/aurelia-build/fund" className="pill-btn gold">Hire &amp; fund escrow →</Link>
        </div>
      )}
    </div>
  );
}
