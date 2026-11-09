import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationMembers, organizations, users } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import AdminStatusToggle from "./AdminStatusToggle";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/admin/users");
  if (!session.user.isAdmin) redirect("/opportunities");

  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

  const memberships = await db
    .select({
      userId: organizationMembers.userId,
      orgName: organizations.name,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id));

  const orgByUserId = new Map(memberships.map((m) => [m.userId, m]));

  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in">
          <p className="eyebrow">ADMIN</p>
          <h1 style={{ marginTop: 14, fontSize: "clamp(32px,4vw,44px)" }}>Users</h1>
          <p style={{ marginTop: 12, color: "var(--on-bone-muted)", maxWidth: "60ch" }}>
            Every account on the platform. Grant admin access carefully — admins can review listings, verify
            organizations and manage platform configuration.
          </p>

          <nav className="admin-tabs" aria-label="Admin sections">
            <Link href="/admin">Review queue</Link>
            <Link href="/admin/organizations">Organizations</Link>
            <Link href="/admin/listings">Listings</Link>
            <Link href="/admin/users" className="on">
              Users
            </Link>
            <Link href="/admin/config">Listing types &amp; reference data</Link>
            <Link href="/admin/reports">Reports</Link>
          </nav>

          <div className="dash-list" style={{ marginTop: 24 }}>
            {allUsers.map((u) => {
              const membership = orgByUserId.get(u.id);
              return (
                <div key={u.id} className="dash-row" style={{ cursor: "default" }}>
                  <div className="dash-row-main">
                    <div>
                      <p className="dash-row-title">
                        {u.name}
                        {u.isAdmin && <span className="featured-tag" style={{ marginLeft: 10 }}>ADMIN</span>}
                      </p>
                      <p className="dash-row-meta">
                        {u.email} ·{" "}
                        {membership
                          ? `${membership.orgName} (${membership.role === "org_admin" ? "org admin" : "member"})`
                          : "No organization"}{" "}
                        · Joined {new Date(u.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <AdminStatusToggle
                    userId={u.id}
                    email={u.email}
                    isAdmin={u.isAdmin}
                    isSelf={u.id === session.user.id}
                  />
                </div>
              );
            })}
            {allUsers.length === 0 && <div className="empty">No users yet.</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
