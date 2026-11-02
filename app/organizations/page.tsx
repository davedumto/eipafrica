import Link from "next/link";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { listings, organizations } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";

export const instant = false;

type SearchParams = { q?: string };

export default async function OrganizationsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();

  const orgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      description: organizations.description,
      isVerified: organizations.isVerified,
      liveListingCount: count(listings.id),
    })
    .from(organizations)
    .leftJoin(listings, and(eq(listings.organizationId, organizations.id), eq(listings.status, "live")))
    .where(q ? ilike(organizations.name, `%${q}%`) : undefined)
    .groupBy(organizations.id)
    .orderBy(desc(organizations.isVerified), desc(count(listings.id)))
    .limit(60);

  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in">
          <div className="ohead">
            <div>
              <p className="eyebrow">ORGANIZATIONS</p>
              <h1 style={{ marginTop: 14, fontSize: "clamp(32px,4vw,48px)" }}>Browse companies</h1>
            </div>
          </div>

          <form method="get" className="frow" style={{ marginTop: 32 }}>
            <input
              className="fq"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by organization name…"
              aria-label="Search organizations"
            />
            <button className="btn-outline" type="submit">
              Search
            </button>
          </form>

          <p className="note" style={{ marginTop: 32 }}>
            <span>{orgs.length} organization{orgs.length === 1 ? "" : "s"}</span>
          </p>

          {orgs.length === 0 ? (
            <div className="empty">No organizations match that search yet.</div>
          ) : (
            <div className="card-grid">
              {orgs.map((o) => (
                <Link key={o.id} href={`/organizations/${o.id}`} className="o-card">
                  <div className="head">
                    {o.isVerified && (
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 10.5,
                          letterSpacing: "0.08em",
                          color: "var(--amber-on-bone)",
                        }}
                      >
                        ✓ VERIFIED
                      </span>
                    )}
                  </div>
                  <h3>{o.name}</h3>
                  {o.description && <p className="summ">{o.description}</p>}
                  <div className="foot">
                    <span className="z">
                      {o.liveListingCount} live listing{o.liveListingCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
