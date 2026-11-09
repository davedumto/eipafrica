import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { countries, listingTypes, listings, organizations, savedListings } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import DashboardNav from "../DashboardNav";
import { badgeClassForSlug } from "@/lib/listing-fields";

export default async function SavedPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/saved");
  }
  const userId = session.user.id;

  const saved = await db
    .select({ listingId: savedListings.listingId, savedAt: savedListings.createdAt })
    .from(savedListings)
    .where(eq(savedListings.userId, userId))
    .orderBy(desc(savedListings.createdAt));

  const listingIds = saved.map((s) => s.listingId);

  const [rows, allTypes, allCountries] = await Promise.all([
    listingIds.length
      ? db
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
            isAnonymous: listings.isAnonymous,
            listingTypeId: listings.listingTypeId,
            status: listings.status,
            orgName: organizations.name,
          })
          .from(listings)
          .innerJoin(organizations, eq(listings.organizationId, organizations.id))
          .where(inArray(listings.id, listingIds))
      : Promise.resolve([]),
    db.select().from(listingTypes),
    db.select().from(countries),
  ]);

  const typeById = new Map(allTypes.map((t) => [t.id, t]));
  const countryIdToCountry = new Map(allCountries.map((c) => [c.id, c]));
  function countryNames(ids: unknown): string {
    if (!Array.isArray(ids)) return "";
    return ids
      .map((id) => countryIdToCountry.get(id as string)?.name)
      .filter(Boolean)
      .join(", ");
  }

  // Preserve saved-order (most recently saved first), not the DB fetch order.
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = listingIds.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <div className="appshell">
      <AppBar />
      <div className="obrowse">
        <DashboardNav active="saved" />
        <main className="obrowse-main">
          <p className="eyebrow">DASHBOARD</p>
          <h1 style={{ marginTop: 14, fontSize: "clamp(28px,3.4vw,38px)" }}>Saved</h1>
          <p style={{ marginTop: 10, color: "var(--on-bone-faint)" }}>Listings you&rsquo;ve bookmarked.</p>

          {ordered.length === 0 ? (
            <div className="empty" style={{ marginTop: 32 }}>
              Nothing saved yet. Tap Save on any listing to bookmark it here.
            </div>
          ) : (
            <div className="card-grid" style={{ marginTop: 32 }}>
              {ordered.map((r) => {
                const type = typeById.get(r.listingTypeId);
                const deal =
                  r.dealSizeAmount && r.dealSizeCurrency
                    ? `${r.dealSizeCurrency} ${Number(r.dealSizeAmount).toLocaleString()}`
                    : r.dealSizeUsd
                      ? `$${Number(r.dealSizeUsd).toLocaleString()}`
                      : null;
                const closing = r.deadlineAt ? `Closes ${new Date(r.deadlineAt).toLocaleDateString()}` : null;
                const notLive = r.status !== "live";
                return (
                  <a
                    key={r.id}
                    href={notLive ? undefined : `/opportunities/${r.id}`}
                    className="o-card"
                    style={notLive ? { cursor: "default", opacity: 0.7 } : undefined}
                    onClick={notLive ? (e) => e.preventDefault() : undefined}
                  >
                    <div className="head">
                      {type && <span className={`badge ${badgeClassForSlug(type.slug)}`}>{type.name}</span>}
                      {notLive && <span className="badge">No longer live</span>}
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
                  </a>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
