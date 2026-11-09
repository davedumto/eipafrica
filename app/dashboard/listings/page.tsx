import { redirect } from "next/navigation";
import { and, desc, eq, inArray, ne, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listings, listingTypes, organizationMembers } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import DashboardNav from "../DashboardNav";
import ListingRowActions from "./ListingRowActions";
import { badgeClassForSlug } from "@/lib/listing-fields";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  live: "Live",
  paused: "Paused",
  closed: "Closed",
};

export default async function MyListingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/listings");
  }
  const userId = session.user.id;

  const myOrgIds = (
    await db
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId))
  ).map((r) => r.organizationId);

  // A draft is a work-in-progress and stays private to whoever created it —
  // the rest of the org only sees a listing once it's been submitted for
  // review (or further along: live, paused, closed, etc).
  const rows = myOrgIds.length
    ? await db
        .select()
        .from(listings)
        .where(
          and(
            inArray(listings.organizationId, myOrgIds),
            or(ne(listings.status, "draft"), eq(listings.createdByUserId, userId)),
          ),
        )
        .orderBy(desc(listings.updatedAt))
    : [];

  const allTypes = await db.select().from(listingTypes);
  const typeById = new Map(allTypes.map((t) => [t.id, t]));

  return (
    <div className="appshell">
      <AppBar />
      <div className="obrowse">
        <DashboardNav active="listings" />
        <main className="obrowse-main">
          <p className="eyebrow">DASHBOARD</p>
          <h1 style={{ marginTop: 14, fontSize: "clamp(28px,3.4vw,38px)" }}>My listings</h1>
          <p style={{ marginTop: 10, color: "var(--on-bone-faint)" }}>
            Every listing you've created, including drafts and listings pending review.
          </p>

          {rows.length === 0 ? (
            <div className="empty" style={{ marginTop: 32 }}>
              You haven&rsquo;t posted anything yet. <a href="/listings/new">Post an opportunity</a> to get started.
            </div>
          ) : (
            <div className="dash-list" style={{ marginTop: 32 }}>
              {rows.map((l) => {
                const type = typeById.get(l.listingTypeId);
                return (
                  <div key={l.id} className="dash-row">
                    <div className="dash-row-main">
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span className="dash-row-title">{l.title}</span>
                        <span className={`badge badge-status-${l.status}`}>
                          {STATUS_LABEL[l.status] ?? l.status}
                        </span>
                      </div>
                      <div className="dash-row-meta">
                        {type && <span className={`badge ${badgeClassForSlug(type.slug)}`}>{type.name}</span>}
                        <span>Updated {new Date(l.updatedAt).toLocaleDateString()}</span>
                        {l.status === "live" && <span>{l.viewCount} views</span>}
                      </div>
                    </div>
                    <ListingRowActions id={l.id} status={l.status} title={l.title} />
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
