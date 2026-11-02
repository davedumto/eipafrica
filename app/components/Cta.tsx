import Link from "next/link";

export default function Cta() {
  return (
    <section className="sec cta" id="start">
      <div className="in">
        <div className="eyebrow">GET STARTED</div>
        <h2>List your first opportunity in a few minutes.</h2>
        <p>Only a few fields are required. Save a draft at any step and come back to it. Our team reviews it before it goes live.</p>
        <div className="acts">
          <Link className="btn-primary" href="/listings/new">
            Post an opportunity
          </Link>
          <Link className="tlink" href="/opportunities" style={{ marginTop: 0 }}>
            Or browse opportunities →
          </Link>
        </div>
      </div>
    </section>
  );
}
