import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationInvites, organizationMembers, organizations, users } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import DashboardNav from "@/app/dashboard/DashboardNav";
import OrganizationForm from "./OrganizationForm";
import TeamMembers from "./TeamMembers";
import InviteForm from "./InviteForm";

export default async function OrganizationSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/account/organization");
  }

  // A user can technically belong to more than one organization in the schema,
  // but nothing in the app's current flows lets someone join a second one yet
  // (onboarding creates exactly one). Showing the first membership covers every
  // real case right now without building an org switcher for a case that
  // doesn't exist in practice.
  const [membership] = await db
    .select({ organizationId: organizationMembers.organizationId, role: organizationMembers.role })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, session.user.id))
    .limit(1);

  if (!membership) {
    redirect("/onboarding");
  }

  const [org] = await db.select().from(organizations).where(eq(organizations.id, membership.organizationId)).limit(1);
  if (!org) {
    redirect("/onboarding");
  }

  const memberRows = await db
    .select({
      id: organizationMembers.id,
      userId: organizationMembers.userId,
      role: organizationMembers.role,
      joinedAt: organizationMembers.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, org.id))
    .orderBy(organizationMembers.createdAt);

  const isAdmin = membership.role === "org_admin";

  const pendingInvites = isAdmin
    ? await db
        .select({
          id: organizationInvites.id,
          email: organizationInvites.email,
          role: organizationInvites.role,
          expiresAt: organizationInvites.expiresAt,
          createdAt: organizationInvites.createdAt,
        })
        .from(organizationInvites)
        .where(and(eq(organizationInvites.organizationId, org.id), isNull(organizationInvites.acceptedAt)))
        .orderBy(organizationInvites.createdAt)
    : [];

  return (
    <div className="appshell">
      <AppBar />
      <div className="obrowse">
        <DashboardNav active="organization" />
        <main className="obrowse-main">
          <p className="eyebrow">DASHBOARD</p>
          <h1 style={{ marginTop: 14, fontSize: "clamp(28px,3.4vw,38px)" }}>Organization</h1>
          <p style={{ marginTop: 10, color: "var(--on-bone-faint)" }}>
            {membership.role === "org_admin"
              ? "Update your organization's public profile."
              : "Only an organization admin can edit these details."}
          </p>

          <OrganizationForm
            orgId={org.id}
            name={org.name}
            description={org.description ?? ""}
            website={org.website ?? ""}
            isAdmin={isAdmin}
          />

          <TeamMembers
            orgId={org.id}
            members={memberRows.map((m) => ({
              id: m.id,
              userId: m.userId,
              name: m.name,
              email: m.email,
              role: m.role,
              joinedAt: m.joinedAt.toISOString(),
            }))}
            currentUserId={session.user.id}
            isAdmin={isAdmin}
          />

          {isAdmin && (
            <InviteForm
              orgId={org.id}
              invites={pendingInvites.map((i) => ({
                id: i.id,
                email: i.email,
                role: i.role,
                expiresAt: i.expiresAt.toISOString(),
                createdAt: i.createdAt.toISOString(),
              }))}
            />
          )}
        </main>
      </div>
    </div>
  );
}
