import { useState } from 'react';
import { threads } from '../data';

export default function Messages() {
  const [sel, setSel] = useState(threads[0].id);
  const [extra, setExtra] = useState<Record<string, { me: boolean; text: string; time: string }[]>>({});
  const [draft, setDraft] = useState('');
  const thread = threads.find(t => t.id === sel)!;
  const msgs = [...thread.msgs, ...(extra[sel] ?? [])];

  const send = () => {
    if (!draft.trim()) return;
    const mine = { me: true, text: draft.trim(), time: 'now' };
    const add = [mine];
    if (sel === 'guardian') {
      add.push({ me: false, text: 'Got it — I\'ve noted that on the contract record. Anything about payments or scope, I\'m here 24/7. A human teammate reviews anything serious.', time: 'now' });
    }
    setExtra({ ...extra, [sel]: [...(extra[sel] ?? []), ...add] });
    setDraft('');
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Messages</h2>
          <p className="page-sub">All conversations stay on Trove — that's what keeps you protected.</p>
        </div>
      </div>
      <div className="msgs-layout">
        <div className="thread-list">
          {threads.map(t => (
            <div key={t.id} className={`thread ${sel === t.id ? 'sel' : ''}`} onClick={() => setSel(t.id)}>
              <div className="avatar" style={t.id === 'guardian' ? { background: 'var(--navy)', color: 'var(--gold)' } : { background: 'var(--navy2)' }}>{t.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="t-n"><span>{t.name}</span><span className="t-time">{t.time}</span></div>
                <div className="t-p">{t.last}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="thread-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, borderBottom: '1px solid var(--line)', paddingBottom: 11, marginBottom: 14 }}>
            <div className="avatar" style={thread.id === 'guardian' ? { background: 'var(--navy)', color: 'var(--gold)' } : { background: 'var(--navy2)' }}>{thread.initials}</div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 13.5 }}>{thread.name}</div>
              <div className="muted" style={{ fontSize: 11.5 }}>
                {thread.id === 'guardian' ? 'Watching over your jobs · here to help' : 'Verified client · escrow funded'}
              </div>
            </div>
          </div>
          <div className="thread-msgs">
            {msgs.map((m, i) => (
              <div key={i} className={`msg ${m.me ? 'me' : ''}`}>
                <div className={`ava ${m.me ? 'mine' : thread.id === 'guardian' ? 'ai' : 'them'}`}>
                  {m.me ? 'JD' : thread.id === 'guardian' ? '🛡' : thread.initials}
                </div>
                <div>
                  <div className="bubble">{m.text}</div>
                  <div className="time" style={{ textAlign: m.me ? 'right' : 'left' }}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input className="input" placeholder={thread.id === 'guardian' ? 'Ask the Guardian anything…' : 'Write a message…'} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
            <button className="pill-btn" onClick={send}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
