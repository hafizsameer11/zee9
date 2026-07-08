import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StepBar, useToast } from '../components';

const SKILL_SUGGESTIONS = ['Shopify', 'React', 'Laravel', 'Figma', 'SEO', 'Copywriting', 'Node.js', 'WordPress'];

export default function Onboarding() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [skills, setSkills] = useState<string[]>(['Shopify', 'Liquid']);
  const [importMode, setImportMode] = useState<'link' | 'interview' | 'skip'>('link');

  const total = 4;
  return (
    <div className="page narrow">
      <div className="card" style={{ padding: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span className="label-sm">Set up your profile · Step {step} of {total}</span>
          <button className="linklike" onClick={() => navigate('/dashboard')}>Skip for now</button>
        </div>
        <StepBar step={step} total={total} />

        {step === 1 && (
          <>
            <h3 style={{ fontSize: 17, color: 'var(--navy)', marginBottom: 3 }}>The basics</h3>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>This is what clients see first — make it count.</p>
            <div className="field"><label>Professional headline</label><input className="input" placeholder="e.g. Senior Shopify & E-commerce Developer" defaultValue="Senior Shopify & E-commerce Developer" /></div>
            <div className="grid2">
              <div className="field"><label>Location</label><input className="input" placeholder="City, Country" defaultValue="Cape Town, ZA" /></div>
              <div className="field"><label>Hourly rate (USD)</label><input className="input" placeholder="45" defaultValue="45" /></div>
            </div>
            <div className="field">
              <label>About you</label>
              <textarea className="input" placeholder="What do you build, for whom, and what results have you delivered?" defaultValue="Shopify specialist with 6 years building high-converting stores for beauty, skincare, and lifestyle brands." />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3 style={{ fontSize: 17, color: 'var(--navy)', marginBottom: 3 }}>Skills</h3>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>Pick up to 10 — these power your job matching score.</p>
            <div className="field">
              <label>Your skills</label>
              <div className="chiprow" style={{ marginBottom: 10 }}>
                {skills.map(s => (
                  <span key={s} className="chip">{s} <span className="x" onClick={() => setSkills(skills.filter(x => x !== s))}>×</span></span>
                ))}
              </div>
              <div className="chiprow">
                {SKILL_SUGGESTIONS.filter(s => !skills.includes(s)).map(s => (
                  <button key={s} className="chip add" onClick={() => setSkills([...skills, s])}>+ {s}</button>
                ))}
              </div>
            </div>
            <div className="hint">Tip: jobs are matched to skills, not keywords stuffed in your bio. Be accurate — your match score depends on it.</div>
          </>
        )}

        {step === 3 && (
          <>
            <h3 style={{ fontSize: 17, color: 'var(--navy)', marginBottom: 3 }}>Bring your reputation with you</h3>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>
              Already earned great reviews elsewhere? Import them so you don't start from zero. Imported reviews are shown as "verified external" until confirmed.
            </p>
            <div className="radio-row" style={{ flexDirection: 'column' }}>
              <button className={`radio-card ${importMode === 'link' ? 'sel' : ''}`} onClick={() => setImportMode('link')}>
                <div className="rc-t">🔗 Paste your profile link — AI scan</div>
                <div className="rc-s">Our AI scans your public profile on another platform and imports your rating, review count, and job history in minutes.</div>
              </button>
              <button className={`radio-card ${importMode === 'interview' ? 'sel' : ''}`} onClick={() => setImportMode('interview')}>
                <div className="rc-t">🎥 Book a verification interview</div>
                <div className="rc-s">A 10-minute video call with our team (available in multiple languages). Best if your work history is spread across platforms.</div>
              </button>
              <button className={`radio-card ${importMode === 'skip' ? 'sel' : ''}`} onClick={() => setImportMode('skip')}>
                <div className="rc-t">🌱 Start fresh as New Talent</div>
                <div className="rc-s">You'll be surfaced to clients who opt in to give newcomers a fair shot.</div>
              </button>
            </div>
            {importMode === 'link' && (
              <div className="field" style={{ marginTop: 14 }}>
                <label>Profile URL</label>
                <input className="input" placeholder="https://www.upwork.com/freelancers/~01234…" />
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h3 style={{ fontSize: 17, color: 'var(--navy)', marginBottom: 3 }}>Verify your identity</h3>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>
              Verification keeps Trove safe and earns you the ✓ Verified badge — clients filter for it.
            </p>
            <div className="notice ok" style={{ marginBottom: 14 }}>
              <span>🛡️</span>
              <span>Your documents are used for verification only, handled by our payments partner's secure KYC flow, and never shown to clients.</span>
            </div>
            <div className="field"><label>Government ID</label><div className="radio-card" style={{ textAlign: 'center', color: 'var(--muted)', cursor: 'pointer' }}>📄 Upload ID document (demo)</div></div>
            <div className="field"><label>Selfie check</label><div className="radio-card" style={{ textAlign: 'center', color: 'var(--muted)', cursor: 'pointer' }}>🤳 Take a selfie (demo)</div></div>
          </>
        )}

        <div className="btn-row">
          {step > 1 ? <button className="pill-btn ghost" onClick={() => setStep(step - 1)}>← Back</button> : <span />}
          {step < total
            ? <button className="pill-btn" onClick={() => setStep(step + 1)}>Next →</button>
            : <button className="pill-btn gold" onClick={() => { toast('Profile submitted — verification usually takes under 24h'); navigate('/dashboard'); }}>Finish &amp; go to dashboard</button>}
        </div>
      </div>
    </div>
  );
}
