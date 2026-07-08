import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StepBar, useToast } from '../components';
import { categories } from '../data';

const AI_DRAFT = `We are launching a premium skincare line and need a fully built Shopify store — 5 pages (Home, Shop, About, Contact, FAQ), product catalogue setup for up to 30 products, and a clean, conversion-focused design consistent with our brand kit. Copy and imagery are ready. The store must be mobile-first, load fast, and be easy for our team to update after handover.`;

export default function PostJob() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState('');
  const [desc, setDesc] = useState('');
  const [aiUsed, setAiUsed] = useState(false);
  const [projType, setProjType] = useState(0);
  const [deliverables, setDeliverables] = useState(['Fully built Shopify store (5 pages)', 'Product catalogue setup (up to 30 products)']);
  const [newDeliv, setNewDeliv] = useState('');
  const total = 5;

  return (
    <div className="page narrow">
      <div className="card" style={{ padding: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span className="label-sm">Post a job · Step {step} of {total}</span>
          <button className="linklike" onClick={() => toast('Draft saved')}>Save draft</button>
        </div>
        <StepBar step={step} total={total} />

        {step === 1 && (
          <>
            <h3 style={{ fontSize: 17, color: 'var(--navy)', marginBottom: 3 }}>What do you need done?</h3>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>Describe it in your own words — our AI will turn it into a clear, professional job post.</p>
            <div className="field">
              <label>Job title</label>
              <input className="input" placeholder="e.g. Shopify store build for skincare brand" defaultValue="Shopify store build for skincare brand" />
            </div>
            <div className="field">
              <label>Rough brief — a sentence or two is enough</label>
              <textarea className="input" placeholder="e.g. i need an online store for my skincare products, about 30 products, needs to look premium" value={brief} onChange={e => setBrief(e.target.value)} />
            </div>
            <button
              className="pill-btn ghost" style={{ width: '100%' }}
              onClick={() => { setDesc(AI_DRAFT); setAiUsed(true); }}
            >
              ✨ Write it for me with AI
            </button>
            {aiUsed && (
              <div className="field" style={{ marginTop: 14 }}>
                <label>AI draft — edit anything you like</label>
                <textarea className="input" style={{ minHeight: 130 }} value={desc} onChange={e => setDesc(e.target.value)} />
                <div className="hint">The AI drafted this from your brief. It also suggested the deliverables you'll confirm in step 3.</div>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h3 style={{ fontSize: 17, color: 'var(--navy)', marginBottom: 3 }}>Category &amp; skills</h3>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>This drives who sees your job — matching is by skills, not keyword spam.</p>
            <div className="field">
              <label>Category</label>
              <select className="input">{categories.map(c => <option key={c}>{c}</option>)}</select>
            </div>
            <div className="field">
              <label>Skills needed</label>
              <div className="chiprow">
                <span className="chip">Shopify</span><span className="chip">Liquid</span><span className="chip">Theme dev</span>
                <button className="chip add">+ Add skill</button>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3 style={{ fontSize: 17, color: 'var(--navy)', marginBottom: 3 }}>Scope &amp; deliverables</h3>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>Define what "done" looks like. This protects you and your freelancer.</p>
            <div className="field">
              <label>Project type</label>
              <div className="radio-row">
                {[
                  { t: 'One-off project', s: 'A single defined deliverable' },
                  { t: 'Ongoing / retainer', s: 'Recurring monthly work' },
                  { t: 'Not sure yet', s: "We'll help you decide" },
                ].map((o, i) => (
                  <button key={o.t} className={`radio-card ${projType === i ? 'sel' : ''}`} onClick={() => setProjType(i)}>
                    <div className="rc-t">{o.t}</div><div className="rc-s">{o.s}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Deliverables — what will you receive?</label>
              {deliverables.map(d => (
                <div key={d} className="input" style={{ marginBottom: 7, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{d}</span>
                  <span className="x" style={{ cursor: 'pointer', color: 'var(--muted)', fontWeight: 800 }} onClick={() => setDeliverables(deliverables.filter(x => x !== d))}>×</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 7 }}>
                <input className="input" placeholder="+ Add another deliverable" value={newDeliv} onChange={e => setNewDeliv(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newDeliv.trim()) { setDeliverables([...deliverables, newDeliv.trim()]); setNewDeliv(''); } }} />
                <button className="pill-btn ghost" onClick={() => { if (newDeliv.trim()) { setDeliverables([...deliverables, newDeliv.trim()]); setNewDeliv(''); } }}>Add</button>
              </div>
            </div>
            <div className="grid2">
              <div className="field">
                <label>Revisions included</label>
                <select className="input"><option>2 rounds of revisions</option><option>1 round of revisions</option><option>3 rounds of revisions</option></select>
                <div className="hint">Extra revisions beyond this are billed as a new milestone — no surprise unpaid work.</div>
              </div>
              <div className="field">
                <label>Timeline</label>
                <select className="input"><option>By a set date — 3 weeks</option><option>Flexible</option><option>ASAP</option></select>
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h3 style={{ fontSize: 17, color: 'var(--navy)', marginBottom: 3 }}>Budget</h3>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>You'll see all costs as line items before funding — nothing hidden.</p>
            <div className="field">
              <label>How do you want to pay?</label>
              <div className="radio-row">
                <div className="radio-card sel"><div className="rc-t">Fixed price</div><div className="rc-s">Pay per milestone</div></div>
                <div className="radio-card"><div className="rc-t">Hourly</div><div className="rc-s">Pay tracked hours weekly</div></div>
              </div>
            </div>
            <div className="grid2">
              <div className="field"><label>Budget from</label><input className="input" defaultValue="$800" /></div>
              <div className="field"><label>Budget to</label><input className="input" defaultValue="$1,200" /></div>
            </div>
            <div className="notice">
              <span>💡</span>
              <span>Similar jobs on Trove hired at <b>$850–1,100</b>. Budgets inside the typical range attract 2× more quality proposals.</span>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h3 style={{ fontSize: 17, color: 'var(--navy)', marginBottom: 3 }}>Review &amp; publish</h3>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>Everything below becomes part of the contract when you hire.</p>
            <div className="rrow"><span className="muted">Title</span><span style={{ fontWeight: 600 }}>Shopify store build for skincare brand</span></div>
            <div className="rrow"><span className="muted">Type</span><span>One-off · Fixed price</span></div>
            <div className="rrow"><span className="muted">Budget</span><span>$800–1,200</span></div>
            <div className="rrow"><span className="muted">Deliverables</span><span>{deliverables.length} defined</span></div>
            <div className="rrow"><span className="muted">Revisions</span><span>2 rounds included</span></div>
            <div className="rrow"><span className="muted">Timeline</span><span>3 weeks</span></div>
            <div className="rrow"><span className="muted">Cost to post</span><span style={{ color: 'var(--green)', fontWeight: 800 }}>Free</span></div>
            <div className="escrow-note"><span>🔒</span><span>You'll only pay when you hire — funds go to escrow, released when you approve the work.</span></div>
          </>
        )}

        <div className="btn-row">
          {step > 1 ? <button className="pill-btn ghost" onClick={() => setStep(step - 1)}>← Back</button> : <span />}
          {step < total
            ? <button className="pill-btn" onClick={() => setStep(step + 1)}>
                {step === 3 ? 'Next: Budget →' : 'Next →'}
              </button>
            : <button className="pill-btn gold" onClick={() => { toast('Job published! Applicants will appear shortly.'); navigate('/jobs/shopify-build/applicants'); }}>Publish job 🎉</button>}
        </div>
      </div>
    </div>
  );
}
