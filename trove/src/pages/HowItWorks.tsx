import { Link } from 'react-router-dom';
import { SiteFooter } from '../components';

export default function HowItWorks() {
  return (
    <div>
      <section className="hero" style={{ padding: '52px 24px 58px' }}>
        <div className="brand">T R O V E</div>
        <h1 style={{ fontSize: 34 }}>Pricing &amp; how it works</h1>
        <p>Every number visible before you confirm. No hidden fees — that's the whole point.</p>
      </section>

      <div className="page mid">
        <div className="grid2" style={{ marginTop: 10 }}>
          <div className="price-card hot">
            <span className="badge b-preferred" style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }}>MOST LOVED</span>
            <div className="who">Freelancers</div>
            <div className="pc">4<small>%</small></div>
            <div className="muted" style={{ fontSize: 13 }}>flat fee, charged only when a job completes</div>
            <ul>
              <li>✓ Free to join — no subscription for the first 6 months</li>
              <li>✓ Bids come with membership, never bought with cash</li>
              <li>✓ Drop to 3% as Preferred, 2.5% at Elite</li>
              <li>✓ Free withdrawals to your bank</li>
              <li>✓ Import reviews from other platforms</li>
            </ul>
          </div>
          <div className="price-card">
            <div className="who">Clients</div>
            <div className="pc">$0<small> to post</small></div>
            <div className="muted" style={{ fontSize: 13 }}>pay only payment processing, shown as a line item</div>
            <ul>
              <li>✓ Post jobs free, with AI drafting help</li>
              <li>✓ Escrow protection on every contract</li>
              <li>✓ Transparent processing fee (~5.4%) shown before funding</li>
              <li>✓ Ranked, spam-free applicant lists</li>
              <li>✓ Trove guarantee on approved work</li>
            </ul>
          </div>
        </div>

        <div className="sec-t" style={{ fontSize: 17, marginTop: 34 }}>The money flow, step by step</div>
        <div className="card">
          <div className="mstone done"><div className="dot">1</div><div><div className="m-t">Client funds a milestone</div><div className="m-s">Project amount + processing shown up front. Money moves into escrow — not to the freelancer, not to Trove's pocket.</div></div></div>
          <div className="mstone done"><div className="dot">2</div><div><div className="m-t">Freelancer works with protection</div><div className="m-s">Scope and revision count are locked in the contract. The Guardian flags scope creep and off-platform payment lures.</div></div></div>
          <div className="mstone done"><div className="dot">3</div><div><div className="m-t">Client approves</div><div className="m-s">Work is reviewed against the agreed deliverables. Disagreements go to a human mediator, assisted by the full contract record.</div></div></div>
          <div className="mstone done"><div className="dot">4</div><div><div className="m-t">Payment releases instantly</div><div className="m-s">The freelancer's 4% fee is deducted at release — fees are only ever charged on completed work.</div></div></div>
        </div>

        <div className="sec-t" style={{ fontSize: 17, marginTop: 28 }}>Worked example</div>
        <div className="card receipt" style={{ maxWidth: 520 }}>
          <div className="rrow"><span className="muted">Project amount (milestone)</span><span>$800.00</span></div>
          <div className="rrow"><span className="muted">Client pays processing (5.4%)</span><span>$43.20</span></div>
          <div className="rrow total"><span>Client funds</span><span>$843.20</span></div>
          <div className="rrow" style={{ marginTop: 10 }}><span className="muted">Freelancer fee (4%)</span><span>−$32.00</span></div>
          <div className="rrow total" style={{ color: 'var(--green)' }}><span>Freelancer receives</span><span>$768.00</span></div>
          <div className="escrow-note"><span>🔒</span><span>On the big platforms the freelancer would keep $640 of this job. On Trove they keep $768.</span></div>
        </div>

        <div className="sec-t" style={{ fontSize: 17, marginTop: 28 }}>Fair-play extras</div>
        <div className="grid2">
          <div className="feat"><div className="f-t">Review appeals — $5</div><div className="f-s">Think a review is unfair? Appeal for $5, reviewed by a human mediator. Win and you get the $5 back; lose and it funds the mediation team.</div></div>
          <div className="feat"><div className="f-t">Tier progression</div><div className="f-s">Complete jobs well to unlock Preferred (3% fee, priority matching) then Elite (2.5% fee, free instant payouts).</div></div>
        </div>

        <div style={{ textAlign: 'center', margin: '36px 0 10px' }}>
          <Link to="/signup" className="pill-btn gold big">Get started free</Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
