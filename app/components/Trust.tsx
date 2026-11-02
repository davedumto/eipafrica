const ITEMS = [
  { tag: "EVERY LISTING", title: "Reviewed before it goes live", text: "A listing becomes visible only once our team approves it. The owner can pause or close it at any time." },
  { tag: "EVERY ORGANISATION", title: "Verified, with a visible badge", text: "Organisations submit registration details and, optionally, past project references. Approved ones are marked Verified." },
  { tag: "CONFIDENTIAL FILES", title: "Released only on the owner’s approval", text: "Teasers can be public. Financial models and permits are requested, and the owner decides who sees them." },
  { tag: "EVERY DOWNLOAD", title: "Logged, so owners can see who has what", text: "Who downloaded a document and when is recorded and shown to the listing owner." },
];

export default function Trust() {
  return (
    <section className="sec dark" id="trust">
      <div className="in">
        <div className="trust">
          <div className="lead">
            <div className="eyebrow">TRUST</div>
            <h2>Credible by design, not by claim.</h2>
            <p>Large deals depend on who is on the other side. These are the checks the platform is built around.</p>
          </div>
          <ul>
            {ITEMS.map((item) => (
              <li key={item.tag}>
                <span className="tg">{item.tag}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
