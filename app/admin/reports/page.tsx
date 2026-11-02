import Link from "next/link";
import { redirect } from "next/navigation";
import { count, eq, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  enquiries,
  listingTypes,
  listings,
  organizations,
  sectors,
  users,
} from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";

export const instant = false;

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/admin/reports");
  if (!session.user.isAdmin) redirect("/opportunities");

  const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS);

  const [
    listingsByStatus,
    listingsByType,
    listingsBySector,
    enquiriesByType,
    enquiriesByStatus,
    orgVerification,
    newUsers30d,
    newOrgs30d,
    newListings30d,
  ] = await Promise.all([
    db
      .select({ status: listings.status, n: count() })
      .from(listings)
      .groupBy(listings.status),
    db
      .select({ name: listingTypes.name, n: count(listings.id) })
      .from(listingTypes)
      .leftJoin(listings, eq(listings.listingTypeId, listingTypes.id))
      .groupBy(listingTypes.id, listingTypes.name)
      .orderBy(sql`count(${listings.id}) desc`),
    db
      .select({ name: sectors.name, n: count(listings.id) })
      .from(sectors)
      .leftJoin(listings, eq(listings.sectorId, sectors.id))
      .groupBy(sectors.id, sectors.name)
      .orderBy(sql`count(${listings.id}) desc`),
    db
      .select({ type: enquiries.type, n: count() })
      .from(enquiries)
      .groupBy(enquiries.type),
    db
      .select({ status: enquiries.status, n: count() })
      .from(enquiries)
      .groupBy(enquiries.status),
    db
      .select({ isVerified: organizations.isVerified, n: count() })
      .from(organizations)
      .groupBy(organizations.isVerified),
    db.select({ n: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo)),
    db.select({ n: count() }).from(organizations).where(gte(organizations.createdAt, thirtyDaysAgo)),
    db.select({ n: count() }).from(listings).where(gte(listings.createdAt, thirtyDaysAgo)),
  ]);

  const verifiedCount = orgVerification.find((r) => r.isVerified)?.n ?? 0;
  const unverifiedCount = orgVerification.find((r) => !r.isVerified)?.n ?? 0;

  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in">
          <p className="eyebrow">ADMIN</p>
          <h1 style={{ marginTop: 14, fontSize: "clamp(32px,4vw,44px)" }}>Reports</h1>

          <nav className="admin-tabs" aria-label="Admin sections">
            <Link href="/admin">Review queue</Link>
            <Link href="/admin/organizations">Organizations</Link>
            <Link href="/admin/listings">Listings</Link>
            <Link href="/admin/users">Users</Link>
            <Link href="/admin/config">Listing types &amp; reference data</Link>
            <Link href="/admin/reports" className="on">
              Reports
            </Link>
          </nav>

          <div className="admin-stats" style={{ marginTop: 24 }}>
            <div>
              <span className="n">{newListings30d[0]?.n ?? 0}</span>
              <span className="lab">New listings (30d)</span>
            </div>
            <div>
              <span className="n">{newOrgs30d[0]?.n ?? 0}</span>
              <span className="lab">New organizations (30d)</span>
            </div>
            <div>
              <span className="n">{newUsers30d[0]?.n ?? 0}</span>
              <span className="lab">New users (30d)</span>
            </div>
            <div>
              <span className="n">{verifiedCount}</span>
              <span className="lab">Verified orgs ({unverifiedCount} unverified)</span>
            </div>
          </div>

          <section className="detail-section" style={{ marginTop: 32 }}>
            <h2>Listings by status</h2>
            <dl className="fieldlist">
              {listingsByStatus.map((r) => (
                <div key={r.status}>
                  <dt>{r.status.replace("_", " ")}</dt>
                  <dd>{r.n}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="detail-section">
            <h2>Listings by type</h2>
            <dl className="fieldlist">
              {listingsByType.map((r) => (
                <div key={r.name}>
                  <dt>{r.name}</dt>
                  <dd>{r.n}</dd>
                </div>
              ))}
              {listingsByType.length === 0 && (
                <div>
                  <dt>No listing types configured</dt>
                  <dd>—</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="detail-section">
            <h2>Listings by sector</h2>
            <dl className="fieldlist">
              {listingsBySector.map((r) => (
                <div key={r.name}>
                  <dt>{r.name}</dt>
                  <dd>{r.n}</dd>
                </div>
              ))}
              {listingsBySector.length === 0 && (
                <div>
                  <dt>No sectors configured</dt>
                  <dd>—</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="detail-section">
            <h2>Enquiries by type</h2>
            <dl className="fieldlist">
              {enquiriesByType.map((r) => (
                <div key={r.type}>
                  <dt>{r.type.replace("_", " ")}</dt>
                  <dd>{r.n}</dd>
                </div>
              ))}
              {enquiriesByType.length === 0 && (
                <div>
                  <dt>No enquiries yet</dt>
                  <dd>—</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="detail-section">
            <h2>Enquiries by status</h2>
            <dl className="fieldlist">
              {enquiriesByStatus.map((r) => (
                <div key={r.status}>
                  <dt>{r.status}</dt>
                  <dd>{r.n}</dd>
                </div>
              ))}
              {enquiriesByStatus.length === 0 && (
                <div>
                  <dt>No enquiries yet</dt>
                  <dd>—</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      </main>
    </div>
  );
}
