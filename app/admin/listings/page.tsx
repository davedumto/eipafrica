import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listingTypes, listings, organizations } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import { badgeClassForSlug } from "@/lib/listing-fields";
import FeatureToggle from "./FeatureToggle";

export const instant = false;

export default async function AdminListingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/admin/listings");
  if (!session.user.isAdmin) redirect("/opportunities");

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      listingTypeId: listings.listingTypeId,
      organizationId: listings.organizationId,
      isFeatured: listings.isFeatured,
      createdAt: listings.createdAt,
    })
    .from(listings)
    .where(eq(listings.status, "live"))
    .orderBy(desc(listings.isFeatured), desc(listings.createdAt));

  const [allTypes, allOrgs] = await Promise.all([
    db.select().from(listingTypes),
    db.select({ id: organizations.id, name: organizations.name }).from(organizations),
  ]);
  const typeById = new Map(allTypes.map((t) => [t.id, t]));
  const orgById = new Map(allOrgs.map((o) => [o.id, o.name]));

  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in">
          <p className="eyebrow">ADMIN</p>
          <h1 style={{ marginTop: 14, fontSize: "clamp(32px,4vw,44px)" }}>Listings</h1>
          <p style={{ marginTop: 12, color: "var(--on-bone-muted)", maxWidth: "60ch" }}>
            Feature a live listing to pin it to the top of Opportunities and the landing page preview.
          </p>

          <nav className="admin-tabs" aria-label="Admin sections">
            <Link href="/admin">Review queue</Link>
            <Link href="/admin/organizations">Organizations</Link>
            <Link href="/admin/listings" className="on">
              Listings
            </Link>
            <Link href="/admin/users">Users</Link>
            <Link href="/admin/config">Listing types &amp; reference data</Link>
            <Link href="/admin/reports">Reports</Link>
          </nav>

          <div className="dash-list" style={{ marginTop: 24 }}>
            {rows.map((l) => {
              const type = typeById.get(l.listingTypeId);
              return (
                <div key={l.id} className="dash-row" style={{ cursor: "default" }}>
                  <div className="dash-row-main">
                    {type && <span className={`badge ${badgeClassForSlug(type.slug)}`}>{type.name}</span>}
                    <div>
                      <p className="dash-row-title">
                        {l.title}
                        {l.isFeatured && <span className="featured-tag" style={{ marginLeft: 10 }}>★ Featured</span>}
                      </p>
                      <p className="dash-row-meta">
                        {orgById.get(l.organizationId) ?? "Unknown org"} · Live since{" "}
                        {new Date(l.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <FeatureToggle listingId={l.id} isFeatured={l.isFeatured} />
                </div>
              );
            })}
            {rows.length === 0 && <div className="empty">No live listings yet.</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
