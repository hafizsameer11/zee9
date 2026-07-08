import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { contracts } from '../data';
import { useRole, useToast } from '../components';

type GMsg = { who: 'ai' | 'me'; text: string; flag?: boolean };

const seedChat: GMsg[] = [
  { who: 'ai', text: "Hi Jane — I'm here if you have any questions about this contract, payments, or deadlines. Milestone 2 is due in 4 days." },
];

function guardianReply(text: string): GMsg {
  const t = text.toLowerCase();
  if (t.includes('off') && (t.includes('platform') || t.includes('bank')) || t.includes('transfer') || t.includes('paypal') || t.includes('direct')) {
    return {
      who: 'ai', flag: true,
      text: "I'd strongly recommend against that. Taking payment off Trove means you lose escrow protection and the Trove guarantee — if they don't pay, we can't help you. Keeping it here protects you. I've noted this exchange and a team member will check in.",
    };
  }
  if (t.includes('revision') || t.includes('scope') || t.includes('extra')) {
    return { who: 'ai', text: 'Your contract includes 2 revision rounds on this milestone. Anything beyond that should be a new milestone — want me to draft a scope-change note you can send to the client?' };
  }
  if (t.includes('deadline') || t.includes('late') || t.includes('extend')) {
    return { who: 'ai', text: 'Milestone 2 is due Jul 12. If you need more time, it\'s best to request an extension now — clients approve 90% of early, well-explained requests. I can draft one for you.' };
  }
  return { who: 'ai', text: 'Noted! I handle questions, scoping, and scam-flagging automatically — and a real person owns every irreversible decision: releasing money, banning a user, or ruling a dispute.' };
}

export default function Workspace() {
  const { id } = useParams();
  const c = contracts.find(x => x.id === id) ?? contracts[0];
  const { role } = useRole();
  const toast = useToast();
  const [chat, setChat] = useState<GMsg[]>(seedChat);
  const [draft, setDraft] = useState('');
  const [tab, setTab] = useState<'milestones' | 'guardian' | 'files'>('milestones');

  const send = () => {
    if (!draft.trim()) return;
    setChat([...chat, { who: 'me', text: draft.trim() }, guardianReply(draft)]);
    setDraft('');
  };

  const funded = c.milestones.filter(m => m.state !== 'todo').reduce((s, m) => s + m.amount, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">{c.title}</h2>
          <p className="page-sub">
            {role === 'freelancer' ? `Client: ${c.client}` : `Freelancer: ${c.freelancer}`} · ${c.amount.toLocaleString()} total · <span className="badge b-guar">✓ Trove Guaranteed</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/messages" className="pill-btn ghost">Message {role === 'freelancer' ? 'client' : 'freelancer'}</Link>
          {role === 'client' && <Link to={`/contracts/${c.id}/fund`} className="pill-btn gold">Fund next milestone</Link>}
        </div>
      </div>

      <div className="statrow">
        <div className="stat"><div className="v">${funded}</div><div className="l">Funded to escrow</div></div>
        <div className="stat"><div className="v green">${c.milestones.filter(m => m.state === 'done').reduce((s, m) => s + m.amount, 0)}</div><div className="l">Released</div></div>
        <div className="stat"><div className="v">{c.milestones.filter(m => m.state === 'done').length} / {c.milestones.length}</div><div className="l">Milestones complete</div></div>
        <div className="stat"><div className="v gold">2</div><div className="l">Revision rounds included</div></div>
      </div>

      <div className="split">
        <div className="card">
          <div className="tabs">
            <button className={tab === 'milestones' ? 'on' : ''} onClick={() => setTab('milestones')}>Milestones</button>
            <button className={tab === 'guardian' ? 'on' : ''} onClick={() => setTab('guardian')}>🛡 Guardian</button>
            <button className={tab === 'files' ? 'on' : ''} onClick={() => setTab('files')}>Files &amp; deliverables</button>
          </div>

          {tab === 'milestones' && (
            <>
              {c.milestones.map((m, i) => (
                <div key={m.title} className={`mstone ${m.state}`}>
                  <div className="dot">{m.state === 'done' ? '✓' : i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div className="m-t">{m.title}</div>
                    <div className="m-s">${m.amount} · {m.due}</div>
                  </div>
                  {m.state === 'now' && role === 'freelancer' && (
                    <button className="mini p" onClick={() => toast('Work submitted — the client has been asked to review')}>Submit work</button>
                  )}
                  {m.state === 'now' && role === 'client' && (
                    <button className="mini p" onClick={() => toast('Approved — payment released instantly')}>Approve &amp; release</button>
                  )}
                  {m.state === 'done' && <span className="badge b-guar">Released</span>}
                </div>
              ))}
              <div className="notice" style={{ marginTop: 14 }}>
                <span>📋</span>
                <span><b>Scope lock:</b> deliverables and 2 revision rounds were agreed at hire. Extra work becomes a new milestone — the Guardian enforces this for both sides.</span>
              </div>
            </>
          )}

          {tab === 'guardian' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, borderBottom: '1px solid var(--line)', paddingBottom: 11, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--navy)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>T</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 13.5 }}>Trove Guardian</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>Watching over this job · here to help</div>
                </div>
              </div>
              {chat.map((m, i) => (
                <div key={i} className={`msg ${m.who === 'me' ? 'me' : ''} ${m.flag ? 'flag' : ''}`}>
                  <div className={`ava ${m.who === 'me' ? 'mine' : 'ai'}`}>{m.who === 'me' ? 'JD' : m.flag ? '⚠️' : '🛡'}</div>
                  <div className="bubble">{m.flag ? <><b>I'd strongly recommend against that. </b>{m.text.replace("I'd strongly recommend against that. ", '')}</> : m.text}</div>
                </div>
              ))}
              <div className="chat-input">
                <input className="input" placeholder="Ask the Guardian anything…" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
                <button className="pill-btn" onClick={send}>Send</button>
              </div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 12, borderTop: '1px dashed var(--line)', paddingTop: 10 }}>
                <b style={{ color: 'var(--navy)' }}>How the Guardian works:</b> it handles questions, scoping, and scam-flagging automatically — but a real person owns the three decisions that can't be undone: releasing money, banning a user, and ruling a contested dispute. AI assists; humans decide.
              </div>
            </>
          )}

          {tab === 'files' && (
            <>
              <div className="listitem"><div><div className="li-t">📦 homepage-final.zip</div><div className="li-s">Milestone 1 deliverable · Jul 1</div></div><button className="mini g">Download</button></div>
              <div className="listitem"><div><div className="li-t">🖼 catalogue-preview.png</div><div className="li-s">Milestone 1 deliverable · Jun 29</div></div><button className="mini g">Download</button></div>
              <div className="listitem"><div><div className="li-t">📄 brand-kit.pdf</div><div className="li-s">Shared by client · Jun 20</div></div><button className="mini g">Download</button></div>
              <button className="pill-btn ghost" style={{ width: '100%', marginTop: 12 }} onClick={() => toast('Upload is wired to storage in the full build')}>+ Upload file</button>
            </>
          )}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <span className="label-sm">Contract scope</span>
            <div className="listitem" style={{ padding: '9px 0' }}><span className="li-s">Deliverables</span><span className="li-t">2 defined</span></div>
            <div className="listitem" style={{ padding: '9px 0' }}><span className="li-s">Revisions</span><span className="li-t">2 rounds</span></div>
            <div className="listitem" style={{ padding: '9px 0' }}><span className="li-s">Timeline</span><span className="li-t">3 weeks</span></div>
            <div className="listitem" style={{ padding: '9px 0' }}><span className="li-s">Fee charged</span><span className="li-t">Only on completion</span></div>
          </div>
          <div className="notice warn" style={{ marginBottom: 14 }}>
            <span>⚖️</span>
            <span>Disagreement? Open a dispute — a human mediator rules it, assisted by the full contract record. <button className="linklike" style={{ color: '#7a5c08', textDecoration: 'underline' }} onClick={() => toast('Dispute flow opens with a human mediator in the full build')}>Open a dispute</button></span>
          </div>
          <div className="escrow-note">
            <span>🔒</span>
            <span>${funded} is protected in escrow for this contract. It moves only when work is approved.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
