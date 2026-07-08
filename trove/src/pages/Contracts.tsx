import { Link } from 'react-router-dom';
import { contracts } from '../data';
import { useRole } from '../components';

export default function Contracts() {
  const { role } = useRole();
  return (
    <div className="page mid">
      <div className="page-head">
        <div>
          <h2 className="page-title">Contracts</h2>
          <p className="page-sub">Every contract is scope-locked and escrow-backed.</p>
        </div>
      </div>
      <div className="card">
        <table className="tbl">
          <thead>
            <tr><th>Contract</th><th>{role === 'freelancer' ? 'Client' : 'Freelancer'}</th><th>Value</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {contracts.map(c => (
              <tr key={c.id}>
                <td className="t-strong">{c.title}</td>
                <td className="muted">{role === 'freelancer' ? c.client : c.freelancer}</td>
                <td className="t-strong">${c.amount.toLocaleString()}</td>
                <td>
                  {c.status === 'In progress' && <span className="badge b-verified">In progress</span>}
                  {c.status === 'Submitted' && <span className="badge b-preferred">Submitted</span>}
                  {c.status === 'Completed' && <span className="badge b-guar">Completed</span>}
                  {c.status === 'Awaiting funding' && <span className="badge b-grey">Awaiting funding</span>}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Link to={`/contracts/${c.id}`} className="mini g" style={{ textDecoration: 'none' }}>Open workspace</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="notice" style={{ marginTop: 16 }}>
        <span>🛡️</span>
        <span>Each workspace includes the Guardian — deadline tracking, scope watch, and scam flagging, 24/7.</span>
      </div>
    </div>
  );
}
