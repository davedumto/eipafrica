import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, count, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listings, listingTypes, organizations, users } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import { badgeClassForSlug } from "@/lib/listing-fields";

export const instant = false;

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/admin");
  if (!session.user.isAdmin) redirect("/opportunities");

  const [pending, liveCount, userCount, orgCount, allTypes] = await Promise.all([
    db
      .select({
        id: listings.id,
        title: listings.title,
        listingTypeId: listings.listingTypeId,
        organizationId: listings.organizationId,
        createdAt: listings.createdAt,
      })
      .from(listings)
      .where(eq(listings.status, "pending_review"))
      .orderBy(asc(listings.createdAt)),
    db.select({ n: count() }).from(listings).where(eq(listings.status, "live")),
    db.select({ n: count() }).from(users),
    db.select({ n: count() }).from(organizations),
    db.select().from(listingTypes),
  ]);

  const orgIds = [...new Set(pending.map((p) => p.organizationId))];
  const orgRows = orgIds.length
    ? await db.select({ id: organizations.id, name: organizations.name }).from(organizations)
    : [];
  const orgById = new Map(orgRows.map((o) => [o.id, o.name]));
  const typeById = new Map(allTypes.map((t) => [t.id, t]));

  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in">
          <p className="eyebrow">ADMIN</p>
          <h1 style={{ marginTop: 14, fontSize: "clamp(32px,4vw,44px)" }}>Review queue</h1>

          <div className="admin-stats">
            <div>
              <span className="n">{pending.length}</span>
              <span className="lab">Pending review</span>
            </div>
            <div>
              <span className="n">{liveCount[0]?.n ?? 0}</span>
              <span className="lab">Live listings</span>
            </div>
            <div>
              <span className="n">{userCount[0]?.n ?? 0}</span>
              <span className="lab">Users</span>
            </div>
            <div>
              <span className="n">{orgCount[0]?.n ?? 0}</span>
              <span className="lab">Organizations</span>
            </div>
          </div>

          <nav className="admin-tabs" aria-label="Admin sections">
            <Link href="/admin" className="on">
              Review queue
            </Link>
            <Link href="/admin/organizations">Organizations</Link>
            <Link href="/admin/listings">Listings</Link>
            <Link href="/admin/users">Users</Link>
            <Link href="/admin/config">Listing types &amp; reference data</Link>
            <Link href="/admin/reports">Reports</Link>
          </nav>

          {pending.length === 0 ? (
            <div className="empty">Nothing waiting for review right now.</div>
          ) : (
            <div className="dash-list" style={{ marginTop: 24 }}>
              {pending.map((p) => {
                const type = typeById.get(p.listingTypeId);
                return (
                  <Link key={p.id} href={`/admin/review/${p.id}`} className="dash-row">
                    <div className="dash-row-main">
                      {type && <span className={`badge ${badgeClassForSlug(type.slug)}`}>{type.name}</span>}
                      <div>
                        <p className="dash-row-title">{p.title}</p>
                        <p className="dash-row-meta">
                          {orgById.get(p.organizationId) ?? "Unknown org"} · Submitted{" "}
                          {new Date(p.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="badge badge-status-pending_review">Pending review</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
