import { useToast } from '../components';

const txns = [
  { d: 'Jul 6, 2026', t: 'Milestone release — Aurelia Skincare (M1)', a: '+$768.00', fee: 'fee $32.00 (4%)', pos: true },
  { d: 'Jul 2, 2026', t: 'Withdrawal to FNB •••1029', a: '−$1,500.00', fee: 'free', pos: false },
  { d: 'Jun 24, 2026', t: 'Milestone release — Northwind Co.', a: '+$432.00', fee: 'fee $18.00 (4%)', pos: true },
  { d: 'Jun 12, 2026', t: 'Milestone release — Bloom & Co.', a: '+$336.00', fee: 'fee $14.00 (4%)', pos: true },
];

export default function Wallet() {
  const toast = useToast();
  return (
    <div className="page mid">
      <div className="page-head">
        <div>
          <h2 className="page-title">Wallet</h2>
          <p className="page-sub">Your earnings, payouts, and fee history — every number visible.</p>
        </div>
      </div>

      <div className="statrow">
        <div className="stat"><div className="v green">$1,240.00</div><div className="l">Available to withdraw</div></div>
        <div className="stat"><div className="v">$180.00</div><div className="l">In escrow (releases on approval)</div></div>
        <div className="stat"><div className="v">$4,820</div><div className="l">Earned this month</div></div>
        <div className="stat"><div className="v gold">4%</div><div className="l">Your current fee tier</div></div>
      </div>

      <div className="split">
        <div className="card">
          <span className="label-sm">Transaction history</span>
          <table className="tbl" style={{ marginTop: 8 }}>
            <thead><tr><th>Date</th><th>Description</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
            <tbody>
              {txns.map(t => (
                <tr key={t.t + t.d}>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{t.d}</td>
                  <td><span className="t-strong">{t.t}</span><div className="muted" style={{ fontSize: 11.5 }}>{t.fee}</div></td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: t.pos ? 'var(--green)' : 'var(--ink)' }}>{t.a}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <span className="label-sm">Withdraw</span>
            <div className="field" style={{ marginTop: 10 }}>
              <label>To</label>
              <select className="input"><option>FNB Bank •••1029</option><option>+ Add payout method</option></select>
            </div>
            <div className="field">
              <label>Amount</label>
              <input className="input" defaultValue="$1,240.00" />
            </div>
            <button className="pill-btn" style={{ width: '100%' }} onClick={() => toast('Withdrawal requested — arrives in 1–2 business days')}>Withdraw — free</button>
            <button className="pill-btn ghost" style={{ width: '100%', marginTop: 7 }} onClick={() => toast('Instant payout is free once you reach Elite')}>Instant payout ⚡</button>
          </div>
          <div className="notice ok">
            <span>💰</span>
            <span>Standard withdrawals are always free on Trove. No "get your own money" fees.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
