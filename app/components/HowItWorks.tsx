const STEPS = [
  { k: "01", title: "List", text: "Use the guided form. Only a few fields are required, and a completeness score shows what would strengthen the listing." },
  { k: "02", title: "Review", text: "Our team checks every listing and organisation before it goes live. Verified organisations carry a badge." },
  { k: "03", title: "Match", text: "Filter by country, sector, size and stage, or save a search and get an email when a new listing fits." },
  { k: "04", title: "Connect", text: "Express interest, ask a question or request documents. Replies stay in one message history." },
];

export default function HowItWorks() {
  return (
    <section className="sec light" id="how">
      <div className="in">
        <div className="eyebrow">HOW IT WORKS</div>
        <h2>From listing to conversation in four steps.</h2>
        <div className="steps">
          {STEPS.map((s) => (
            <div className="step" key={s.k}>
              <div className="k">
                <span>{s.k}</span>
                <i></i>
              </div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
