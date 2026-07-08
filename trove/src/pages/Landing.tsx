import { Link } from 'react-router-dom';
import { SiteFooter } from '../components';

export default function Landing() {
  return (
    <div style={{ background: 'var(--cloud)' }}>
      <section className="hero">
        <div className="brand">T R O V E</div>
        <h1>The freelance platform<br />that <span className="g">actually protects</span> both sides</h1>
        <p>
          Fair fees you can see. Escrow on every job. Scope locked before work starts.
          And an AI Guardian watching over every contract — with a human behind every serious decision.
        </p>
        <div className="cta">
          <Link to="/signup" className="pill-btn gold big">Join as a freelancer</Link>
          <Link to="/post-job" className="pill-btn big" style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.4)' }}>Post a job — it's free</Link>
        </div>
        <div className="trustline">
          <span><b>4%</b> freelancer fee — not 20%</span>
          <span><b>$0</b> to join, no fee on bids</span>
          <span><b>100%</b> of jobs escrow-protected</span>
        </div>
      </section>

      <section className="landing-sec">
        <div className="inner">
          <h2>Why freelancers and clients are switching</h2>
          <p className="sub">Every feature exists to fix something the big platforms got wrong.</p>
          <div className="grid3">
            <div className="feat">
              <div className="ic">💰</div>
              <div className="f-t">Fees that don't punish you</div>
              <div className="f-s">Freelancers keep 96% of what they earn. Clients see every cost as a transparent line item before funding. No hidden charges, ever.</div>
            </div>
            <div className="feat">
              <div className="ic">🔒</div>
              <div className="f-t">Escrow on every job</div>
              <div className="f-s">Clients fund milestones up front; money is released only when work is approved. Freelancers never chase invoices again.</div>
            </div>
            <div className="feat">
              <div className="ic">🛡️</div>
              <div className="f-t">The AI Guardian</div>
              <div className="f-s">A guardian on every contract — answering questions, flagging scams and scope creep 24/7. A real human owns every irreversible decision.</div>
            </div>
            <div className="feat">
              <div className="ic">📋</div>
              <div className="f-t">Scope locked up front</div>
              <div className="f-s">Deliverables and revision counts are set before work starts and flow into the contract. No more endless "one small change".</div>
            </div>
            <div className="feat">
              <div className="ic">⭐</div>
              <div className="f-t">Bring your reputation with you</div>
              <div className="f-s">Import your reviews from other platforms — via AI profile scan or a short verification interview. Start here with the trust you earned there.</div>
            </div>
            <div className="feat">
              <div className="ic">🌱</div>
              <div className="f-t">A fair start for new talent</div>
              <div className="f-s">New freelancers are surfaced to clients who opt in to give newcomers a shot — clearly tagged, never hidden on page 40.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-sec alt">
        <div className="inner">
          <h2>How it works</h2>
          <p className="sub">From posting to payout in four protected steps.</p>
          <div className="grid2" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <div className="feat">
              <div className="step-n">1</div>
              <div className="f-t">Post with AI help</div>
              <div className="f-s">Describe what you need — our AI turns it into a clear job post with scoped deliverables and a fair budget range.</div>
            </div>
            <div className="feat">
              <div className="step-n">2</div>
              <div className="f-t">Pick from ranked matches</div>
              <div className="f-s">A focused set of quality applicants — not 80 spam proposals. Verified and Preferred badges at a glance.</div>
            </div>
            <div className="feat">
              <div className="step-n">3</div>
              <div className="f-t">Fund escrow securely</div>
              <div className="f-s">Money sits safely in escrow while work happens. The Guardian watches deadlines and flags anything odd.</div>
            </div>
            <div className="feat">
              <div className="step-n">4</div>
              <div className="f-t">Approve &amp; release</div>
              <div className="f-s">Approve the work and payment releases instantly. Fees are only charged when the job is actually done.</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 30 }}>
            <Link to="/how-it-works" className="pill-btn ghost big">See full pricing →</Link>
          </div>
        </div>
      </section>

      <section className="landing-sec">
        <div className="inner" style={{ textAlign: 'center', maxWidth: 640 }}>
          <h2>Launching free for freelancers</h2>
          <p className="sub" style={{ marginBottom: 22 }}>
            No subscription fees for freelancers for the first 6 months. Join early, help shape the platform, and lock in Preferred status faster.
          </p>
          <Link to="/signup" className="pill-btn gold big">Create your free profile</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
