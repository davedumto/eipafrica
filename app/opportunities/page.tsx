import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { countries, listingTypes, listings, organizations, sectors, type ProjectStage } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import { badgeClassForSlug } from "@/lib/listing-fields";
import SortSelect from "./SortSelect";

type SearchParams = {
  q?: string;
  type?: string | string[];
  sector?: string | string[];
  country?: string | string[];
  stage?: string | string[];
  min?: string;
  max?: string;
  sort?: string;
};

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

const STAGES = [
  { value: "concept", label: "Concept" },
  { value: "feasibility", label: "Feasibility" },
  { value: "development", label: "Development" },
  { value: "financial_close", label: "Financial close" },
  { value: "construction", label: "Construction" },
  { value: "operational", label: "Operational" },
];

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const isLoggedIn = Boolean(session?.user?.id);

  const q = (sp.q ?? "").trim();
  const typeSlugs = toArray(sp.type);
  const sectorSlugs = toArray(sp.sector);
  const countryCodes = toArray(sp.country);
  const stages = toArray(sp.stage);
  const min = sp.min ? Number(sp.min) : undefined;
  const max = sp.max ? Number(sp.max) : undefined;
  const sort = sp.sort ?? "newest";

  const [allTypes, allSectors, allCountries] = await Promise.all([
    db.select().from(listingTypes).orderBy(asc(listingTypes.sortOrder)),
    db.select().from(sectors).orderBy(asc(sectors.name)),
    db.select().from(countries).orderBy(asc(countries.name)),
  ]);

  const visibilityClause = isLoggedIn
    ? inArray(listings.visibility, ["public", "members_only"])
    : eq(listings.visibility, "public");

  const conditions = [eq(listings.status, "live"), visibilityClause];

  if (q) {
    conditions.push(
      or(
        like(listings.title, `%${q}%`),
        like(listings.summary, `%${q}%`),
        like(listings.city, `%${q}%`),
        like(listings.region, `%${q}%`),
      )!,
    );
  }

  if (typeSlugs.length) {
    const ids = allTypes.filter((t) => typeSlugs.includes(t.slug)).map((t) => t.id);
    if (ids.length) conditions.push(inArray(listings.listingTypeId, ids));
  }

  if (sectorSlugs.length) {
    const ids = allSectors.filter((s) => sectorSlugs.includes(s.slug)).map((s) => s.id);
    if (ids.length) conditions.push(inArray(listings.sectorId, ids));
  }

  if (stages.length) {
    conditions.push(inArray(listings.projectStage, stages as ProjectStage[]));
  }

  if (min !== undefined && !Number.isNaN(min)) {
    conditions.push(gte(listings.dealSizeUsd, min));
  }
  if (max !== undefined && !Number.isNaN(max)) {
    conditions.push(lte(listings.dealSizeUsd, max));
  }

  if (countryCodes.length) {
    const ids = allCountries.filter((c) => countryCodes.includes(c.code)).map((c) => c.id);
    if (ids.length) {
      // SQLite has no Postgres-style jsonb "?|" operator — this checks
      // whether listings.country_ids (a JSON array of ids) contains at
      // least one of the given ids, via json_each + EXISTS.
      conditions.push(
        sql`EXISTS (SELECT 1 FROM json_each(${listings.countryIds}) WHERE json_each.value IN (${sql.join(ids, sql`, `)}))`,
      );
    }
  }

  const orderBy =
    sort === "closing"
      ? asc(listings.deadlineAt)
      : sort === "largest"
        ? desc(listings.dealSizeUsd)
        : desc(listings.createdAt);

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      summary: listings.summary,
      city: listings.city,
      region: listings.region,
      countryIds: listings.countryIds,
      dealSizeUsd: listings.dealSizeUsd,
      dealSizeAmount: listings.dealSizeAmount,
      dealSizeCurrency: listings.dealSizeCurrency,
      projectStage: listings.projectStage,
      deadlineAt: listings.deadlineAt,
      createdAt: listings.createdAt,
      isAnonymous: listings.isAnonymous,
      isFeatured: listings.isFeatured,
      listingTypeId: listings.listingTypeId,
      orgName: organizations.name,
    })
    .from(listings)
    .innerJoin(organizations, eq(listings.organizationId, organizations.id))
    .where(and(...conditions))
    .orderBy(desc(listings.isFeatured), orderBy)
    .limit(60);

  const typeById = new Map(allTypes.map((t) => [t.id, t]));
  const countryIdToCountry = new Map(allCountries.map((c) => [c.id, c]));

  function countryNames(ids: unknown): string {
    if (!Array.isArray(ids)) return "";
    return ids
      .map((id) => countryIdToCountry.get(id as string)?.name)
      .filter(Boolean)
      .join(", ");
  }

  const qs = (overrides: Partial<Record<string, string>>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    typeSlugs.forEach((t) => params.append("type", t));
    sectorSlugs.forEach((s) => params.append("sector", s));
    countryCodes.forEach((c) => params.append("country", c));
    stages.forEach((s) => params.append("stage", s));
    if (min !== undefined) params.set("min", String(min));
    if (max !== undefined) params.set("max", String(max));
    if (sort !== "newest") params.set("sort", sort);
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
    });
    return `?${params.toString()}`;
  };

  function toggled(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  const multiQs = (key: "type" | "sector" | "country" | "stage", current: string[], value: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    (key === "type" ? toggled(typeSlugs, value) : typeSlugs).forEach((v) => params.append("type", v));
    (key === "sector" ? toggled(sectorSlugs, value) : sectorSlugs).forEach((v) => params.append("sector", v));
    (key === "country" ? toggled(countryCodes, value) : countryCodes).forEach((v) => params.append("country", v));
    (key === "stage" ? toggled(stages, value) : stages).forEach((v) => params.append("stage", v));
    if (min !== undefined) params.set("min", String(min));
    if (max !== undefined) params.set("max", String(max));
    if (sort !== "newest") params.set("sort", sort);
    return `?${params.toString()}`;
  };

  return (
    <div className="appshell">
      <AppBar />
      <div className="obrowse">
        <aside className="ofilters">
          <div className="ofilters-head">
            <h2>Filters</h2>
            {(typeSlugs.length || sectorSlugs.length || countryCodes.length || stages.length || q || min || max) && (
              <Link className="reset" href="/opportunities">
                Reset all
              </Link>
            )}
          </div>
          <details className="grp" open={typeSlugs.length > 0}>
            <summary className="lab">
              Listing type{typeSlugs.length > 0 && <span className="lab-count">{typeSlugs.length}</span>}
            </summary>
            <div className="opts">
              {allTypes.map((t) => (
                <Link key={t.id} href={multiQs("type", typeSlugs, t.slug)} scroll={false}>
                  <label>
                    <input type="checkbox" readOnly checked={typeSlugs.includes(t.slug)} />
                    {t.name}
                  </label>
                </Link>
              ))}
            </div>
          </details>
          <details className="grp" open={sectorSlugs.length > 0}>
            <summary className="lab">
              Sector{sectorSlugs.length > 0 && <span className="lab-count">{sectorSlugs.length}</span>}
            </summary>
            <div className="opts">
              {allSectors.map((s) => (
                <Link key={s.id} href={multiQs("sector", sectorSlugs, s.slug)} scroll={false}>
                  <label>
                    <input type="checkbox" readOnly checked={sectorSlugs.includes(s.slug)} />
                    {s.name}
                  </label>
                </Link>
              ))}
            </div>
          </details>
          <details className="grp" open={countryCodes.length > 0}>
            <summary className="lab">
              Country{countryCodes.length > 0 && <span className="lab-count">{countryCodes.length}</span>}
            </summary>
            <div className="opts">
              {allCountries.map((c) => (
                <Link key={c.id} href={multiQs("country", countryCodes, c.code)} scroll={false}>
                  <label>
                    <input type="checkbox" readOnly checked={countryCodes.includes(c.code)} />
                    {c.name}
                  </label>
                </Link>
              ))}
            </div>
          </details>
          <details className="grp" open={stages.length > 0}>
            <summary className="lab">
              Project stage{stages.length > 0 && <span className="lab-count">{stages.length}</span>}
            </summary>
            <div className="opts">
              {STAGES.map((s) => (
                <Link key={s.value} href={multiQs("stage", stages, s.value)} scroll={false}>
                  <label>
                    <input type="checkbox" readOnly checked={stages.includes(s.value)} />
                    {s.label}
                  </label>
                </Link>
              ))}
            </div>
          </details>
        </aside>

        <main className="obrowse-main">
          <div className="ohead">
            <div>
              <p className="eyebrow">OPPORTUNITIES</p>
              <h1 style={{ marginTop: 14, fontSize: "clamp(32px,4vw,48px)" }}>Browse live opportunities</h1>
            </div>
            <Link className="btn-dark" href="/listings/new">
              Post an opportunity
            </Link>
          </div>

          <form method="get" className="frow" style={{ marginTop: 32 }}>
            <input
              className="fq"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by title, summary or location…"
              aria-label="Search opportunities"
            />
            {typeSlugs.map((t) => (
              <input key={`t-${t}`} type="hidden" name="type" value={t} />
            ))}
            {sectorSlugs.map((s) => (
              <input key={`s-${s}`} type="hidden" name="sector" value={s} />
            ))}
            {countryCodes.map((c) => (
              <input key={`c-${c}`} type="hidden" name="country" value={c} />
            ))}
            {stages.map((s) => (
              <input key={`st-${s}`} type="hidden" name="stage" value={s} />
            ))}
            {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
            <button className="btn-outline" type="submit">
              Search
            </button>
            <div style={{ marginLeft: "auto", width: 200 }}>
              <SortSelect value={sort} />
            </div>
          </form>

          {(typeSlugs.length > 0 || sectorSlugs.length > 0 || countryCodes.length > 0 || stages.length > 0 || q) && (
            <div className="active-filters" style={{ marginTop: 24 }}>
              {q && (
                <Link className="fchip" href={qs({ q: undefined })} scroll={false} aria-pressed="true">
                  “{q}” ×
                </Link>
              )}
              {typeSlugs.map((t) => (
                <Link key={`at-${t}`} className="fchip" href={multiQs("type", typeSlugs, t)} scroll={false} aria-pressed="true">
                  {allTypes.find((x) => x.slug === t)?.name ?? t} ×
                </Link>
              ))}
              {sectorSlugs.map((s) => (
                <Link key={`as-${s}`} className="fchip" href={multiQs("sector", sectorSlugs, s)} scroll={false} aria-pressed="true">
                  {allSectors.find((x) => x.slug === s)?.name ?? s} ×
                </Link>
              ))}
              {countryCodes.map((c) => (
                <Link key={`ac-${c}`} className="fchip" href={multiQs("country", countryCodes, c)} scroll={false} aria-pressed="true">
                  {allCountries.find((x) => x.code === c)?.name ?? c} ×
                </Link>
              ))}
              {stages.map((s) => (
                <Link key={`ast-${s}`} className="fchip" href={multiQs("stage", stages, s)} scroll={false} aria-pressed="true">
                  {STAGES.find((x) => x.value === s)?.label ?? s} ×
                </Link>
              ))}
            </div>
          )}
          <p className="note" style={{ marginTop: 16 }}>
            <span>{rows.length} opportunit{rows.length === 1 ? "y" : "ies"}</span>
          </p>

          {rows.length === 0 ? (
            <div className="empty">No opportunities match these filters yet. Try widening your search.</div>
          ) : (
            <div className="card-grid">
              {rows.map((r) => {
                const type = typeById.get(r.listingTypeId);
                const deal =
                  r.dealSizeAmount && r.dealSizeCurrency
                    ? `${r.dealSizeCurrency} ${Number(r.dealSizeAmount).toLocaleString()}`
                    : r.dealSizeUsd
                      ? `$${Number(r.dealSizeUsd).toLocaleString()}`
                      : null;
                const closing = r.deadlineAt
                  ? `Closes ${new Date(r.deadlineAt).toLocaleDateString()}`
                  : null;
                return (
                  <Link key={r.id} href={`/opportunities/${r.id}`} className="o-card">
                    <div className="head">
                      {type && <span className={`badge ${badgeClassForSlug(type.slug)}`}>{type.name}</span>}
                      {r.isFeatured && <span className="featured-tag">★ Featured</span>}
                    </div>
                    <h3>{r.title}</h3>
                    <div className="meta">
                      <span>{countryNames(r.countryIds) || r.region || "—"}</span>
                      {r.projectStage && <span>{r.projectStage.replace("_", " ")}</span>}
                      {!r.isAnonymous && <span>{r.orgName}</span>}
                    </div>
                    <p className="summ">{r.summary}</p>
                    <div className="foot">
                      <span className="z">{deal ?? "—"}</span>
                      {closing && <span className="closing">{closing}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
