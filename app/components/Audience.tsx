const CARDS = [
  { title: "Project developers and owners", posts: "Projects needing funding, an EPC, equipment or a buyer", finds: "Investors, EPCs, suppliers" },
  { title: "Investors", posts: "Investment criteria: ticket size, sectors, countries", finds: "Projects and assets to fund or acquire" },
  { title: "EPC contractors", posts: "Company profile, capabilities, track record", finds: "Projects needing an EPC" },
  { title: "Suppliers and sellers", posts: "Products, equipment, services", finds: "Projects and tenders to bid on" },
  { title: "Asset sellers", posts: "Operating assets or stakes for sale", finds: "Buyers and investors" },
  { title: "Advisors and public agencies", posts: "Services offered, tenders, PPP opportunities", finds: "Bidders, investors, projects needing support" },
];

export default function Audience() {
  return (
    <section className="sec light">
      <div className="in">
        <div className="eyebrow">WHO IT IS FOR</div>
        <h2>Both sides of the deal, on one platform.</h2>
        <div className="aud">
          {CARDS.map((c) => (
            <div className="a" key={c.title}>
              <h3>{c.title}</h3>
              <dl>
                <dt>POSTS</dt>
                <dd>{c.posts}</dd>
                <dt>FINDS</dt>
                <dd>{c.finds}</dd>
              </dl>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
