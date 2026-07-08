import { useNavigate, useParams } from 'react-router-dom';
import { escrow } from '../data';
import { useToast } from '../components';

export default function FundEscrow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const processing = escrow.project * escrow.processingRate;
  const total = escrow.project + processing;
  const freelancerGets = escrow.project * (1 - escrow.freelancerFeeRate);
  return (
    <div className="page">
      <div className="card receipt">
        <h3 style={{ fontSize: 16, color: 'var(--navy)', textAlign: 'center', marginBottom: 4 }}>Fund this contract</h3>
        <p className="muted" style={{ fontSize: 12.5, textAlign: 'center', marginBottom: 16 }}>{escrow.clientLabel}</p>
        <div className="rrow"><span className="muted">Project amount</span><span>${escrow.project.toFixed(2)}</span></div>
        <div className="rrow"><span className="muted">Payment processing</span><span>${processing.toFixed(2)}</span></div>
        <div className="rrow total"><span>Total you fund now</span><span>${total.toFixed(2)}</span></div>
        <div className="escrow-note">
          <span>🔒</span>
          <span>Held safely in escrow. Released to your freelancer only when you approve the work. Backed by the Trove guarantee.</span>
        </div>
        <div className="field" style={{ marginTop: 16 }}>
          <label>Payment method</label>
          <select className="input"><option>Visa •••• 4242</option><option>+ Add new card</option></select>
        </div>
        <button
          className="pill-btn" style={{ width: '100%', marginTop: 6, padding: 11 }}
          onClick={() => { toast('Escrow funded — your freelancer has been notified'); navigate(`/contracts/${id ?? 'aurelia-build'}`); }}
        >
          Fund escrow securely
        </button>
        <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 10 }}>
          Your freelancer is shown their 4% fee separately and keeps ${freelancerGets.toFixed(0)} of this milestone.
        </p>
      </div>
    </div>
  );
}
