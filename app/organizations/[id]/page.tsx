import { notFound } from "next/navigation";
import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { countries, listingTypes, listings, organizations } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import { badgeClassForSlug } from "@/lib/listing-fields";

export const instant = false;

export default async function OrganizationProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const isLoggedIn = Boolean(session?.user?.id);

  const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  if (!org) notFound();

  // Same visibility rule as the main Opportunities browse page: a logged-out
  // visitor only sees public listings, a logged-in visitor also sees
  // members_only ones. Private listings and anything not live never show here.
  const visibilityStatuses = isLoggedIn ? (["public", "members_only"] as const) : (["public"] as const);

  const [rows, allTypes, allCountries] = await Promise.all([
    db
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
        listingTypeId: listings.listingTypeId,
      })
      .from(listings)
      .where(
        and(
          eq(listings.organizationId, id),
          eq(listings.status, "live"),
          inArray(listings.visibility, visibilityStatuses),
        ),
      )
      .orderBy(desc(listings.createdAt))
      .limit(60),
    db.select().from(listingTypes),
    db.select().from(countries),
  ]);

  const typeById = new Map(allTypes.map((t) => [t.id, t]));
  const countryIdToCountry = new Map(allCountries.map((c) => [c.id, c]));

  function countryNames(ids: unknown): string {
    if (!Array.isArray(ids)) return "";
    return ids
      .map((cid) => countryIdToCountry.get(cid as string)?.name)
      .filter(Boolean)
      .join(", ");
  }

  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in">
          <p className="eyebrow">ORGANIZATION</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "clamp(32px,4vw,44px)" }}>{org.name}</h1>
            {org.isVerified && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "var(--amber-on-bone)",
                }}
              >
                ✓ VERIFIED ORGANIZATION
              </span>
            )}
          </div>

          {org.description && (
            <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.6, color: "var(--on-bone-muted)", maxWidth: "70ch" }}>
              {org.description}
            </p>
          )}

          {org.website && (
            <a
              href={org.website}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
              style={{ marginTop: 16, display: "inline-flex" }}
            >
              Visit website
            </a>
          )}

          <section className="detail-section">
            <h2>Live opportunities</h2>
            {rows.length === 0 ? (
              <div className="empty" style={{ marginTop: 16 }}>
                {org.name} doesn&rsquo;t have any live listings right now.
              </div>
            ) : (
              <div className="card-grid" style={{ marginTop: 20 }}>
                {rows.map((r) => {
                  const type = typeById.get(r.listingTypeId);
                  const deal =
                    r.dealSizeAmount && r.dealSizeCurrency
                      ? `${r.dealSizeCurrency} ${Number(r.dealSizeAmount).toLocaleString()}`
                      : r.dealSizeUsd
                        ? `$${Number(r.dealSizeUsd).toLocaleString()}`
                        : null;
                  const closing = r.deadlineAt ? `Closes ${new Date(r.deadlineAt).toLocaleDateString()}` : null;
                  return (
                    <Link key={r.id} href={`/opportunities/${r.id}`} className="o-card">
                      <div className="head">
                        {type && <span className={`badge ${badgeClassForSlug(type.slug)}`}>{type.name}</span>}
                      </div>
                      <h3>{r.title}</h3>
                      <div className="meta">
                        <span>{countryNames(r.countryIds) || r.region || "—"}</span>
                        {r.projectStage && <span>{r.projectStage.replace("_", " ")}</span>}
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
          </section>
        </div>
      </main>
    </div>
  );
}
