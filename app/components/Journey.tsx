"use client";

import { CHAPTERS, sectorStats, type Listing } from "../data";
import { useFilter, scrollToOpportunities } from "./FilterStore";

export default function Journey() {
  const { setFilter, chapter } = useFilter();
  const active = Math.max(chapter, 0);

  const goSector = (sector: Listing["sector"]) => {
    setFilter({ type: "All", sector, size: "any", q: "" });
    scrollToOpportunities();
  };

  return (
    <section className="journey" id="journey" aria-label="Sectors">
      <div className="stick">
        <div className="in">
          <div className="jpanel">
            <div className="eyebrow">THE PLATFORM, BY SECTOR</div>
            <h2>Start from the infrastructure, then find the deal.</h2>
            <ol className="clist" id="clist" aria-label="Sector chapters">
              {CHAPTERS.map((c, i) => (
                <li key={c.name} className={i === active ? "on" : undefined}>
                  <span className="n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="t">{c.name}</span>
                </li>
              ))}
            </ol>
            <div className="cbody" id="cbody">
              {CHAPTERS.map((c, i) => {
                const s = sectorStats(c.sector);
                return (
                  <article key={c.name} className={`chapter${i === active ? " on" : ""}`} aria-label={c.name}>
                    <p>{c.text}</p>
                    <div className="chips">
                      {c.chips.map((chip) => (
                        <button key={chip} type="button" className="chip" onClick={() => goSector(c.sector)}>
                          {chip}
                        </button>
                      ))}
                    </div>
                    <dl className="stats">
                      <div>
                        <dt>LISTINGS</dt>
                        <dd>{s.n}</dd>
                      </div>
                      <div>
                        <dt>DEAL SIZE</dt>
                        <dd>{s.range}</dd>
                      </div>
                      <div>
                        <dt>COUNTRIES</dt>
                        <dd>{s.countries}</dd>
                      </div>
                    </dl>
                    <div className="stats-note">SAMPLE DATA</div>
                    <button className="tlink" type="button" onClick={() => goSector(c.sector)}>
                      View {c.name.toLowerCase()} opportunities →
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
