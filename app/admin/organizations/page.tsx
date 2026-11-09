import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import VerifyToggle from "./VerifyToggle";

export default async function AdminOrganizationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/admin/organizations");
  if (!session.user.isAdmin) redirect("/opportunities");

  const orgs = await db.select().from(organizations).orderBy(desc(organizations.createdAt));

  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in">
          <p className="eyebrow">ADMIN</p>
          <h1 style={{ marginTop: 14, fontSize: "clamp(32px,4vw,44px)" }}>Organizations</h1>

          <nav className="admin-tabs" aria-label="Admin sections">
            <Link href="/admin">Review queue</Link>
            <Link href="/admin/organizations" className="on">
              Organizations
            </Link>
            <Link href="/admin/listings">Listings</Link>
            <Link href="/admin/users">Users</Link>
            <Link href="/admin/config">Listing types &amp; reference data</Link>
            <Link href="/admin/reports">Reports</Link>
          </nav>

          <div className="dash-list" style={{ marginTop: 24 }}>
            {orgs.map((org) => (
              <div key={org.id} className="dash-row" style={{ cursor: "default" }}>
                <div className="dash-row-main">
                  <div>
                    <p className="dash-row-title">
                      {org.name}
                      {org.isVerified && <span className="verified" style={{ marginLeft: 10 }}>✓ Verified</span>}
                    </p>
                    <p className="dash-row-meta">
                      {org.website ? org.website : "No website on file"} · Joined{" "}
                      {new Date(org.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <VerifyToggle organizationId={org.id} isVerified={org.isVerified} />
              </div>
            ))}
            {orgs.length === 0 && <div className="empty">No organizations yet.</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
