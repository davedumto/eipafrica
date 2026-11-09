import AppBar from "@/app/components/AppBar";

const MODELS = [
  {
    name: "Thermal power plant, cooling tower",
    url: "https://sketchfab.com/3d-models/thermal-power-plant-cooling-tower-ff3cdef5f8e24605b56648918e1f9a8a",
    author: "Metazeon",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    name: "Dam during winter",
    url: "https://sketchfab.com/3d-models/dam-during-winter-15f640fda8f14a4997850ab62d87a99b",
    author: "orphanrtg",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    name: "Pylon",
    url: "https://sketchfab.com/3d-models/pylon-5bc9e49be13b4803aed3c25e87bb4486",
    author: "rhcreations",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    name: "Wind Turbine",
    url: "https://sketchfab.com/3d-models/wind-turbine-86644810fea046e788b9679122c3bf69",
    author: "David Junghanns",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
];

export default function CreditsPage() {
  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in">
          <p className="eyebrow">LEGAL</p>
          <h1 style={{ marginTop: 14, fontSize: "clamp(32px,4vw,44px)" }}>Credits</h1>
          <p style={{ marginTop: 16, color: "var(--on-bone-muted)", maxWidth: "60ch" }}>
            The 3D models used on our homepage are from Sketchfab. All were reduced in size for the
            web; the scanned ones are faded at their edges.
          </p>

          <section className="detail-section">
            <h2>3D models</h2>
            <div className="fieldlist" style={{ gridTemplateColumns: "1fr" }}>
              {MODELS.map((m) => (
                <div key={m.name} style={{ paddingBottom: 16, borderBottom: "1px solid rgba(16,17,20,0.08)" }}>
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontWeight: 600, color: "var(--on-bone)", textDecoration: "underline" }}
                  >
                    {m.name}
                  </a>
                  <p style={{ marginTop: 4, fontSize: 14, color: "var(--on-bone-muted)" }}>
                    by {m.author} ·{" "}
                    <a
                      href={m.licenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--amber-on-bone)" }}
                    >
                      {m.licence}
                    </a>
                  </p>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 20, fontSize: 14, color: "var(--on-bone-faint)", maxWidth: "70ch" }}>
              <strong>Share-alike notice:</strong> the Wind Turbine model is licensed CC BY-SA 4.0. The
              reduced versions used on this site are adaptations and are shared under the same CC BY-SA 4.0
              licence.
            </p>
          </section>

          <section className="detail-section">
            <h2>Fonts &amp; libraries</h2>
            <p style={{ marginTop: 12, fontSize: 14, color: "var(--on-bone-muted)" }}>
              Instrument Serif, Hanken Grotesk and JetBrains Mono — SIL Open Font Licence, via Google
              Fonts. Three.js — MIT Licence.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
