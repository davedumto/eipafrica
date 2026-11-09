import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enquiries, listings, organizations } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import DashboardNav from "../DashboardNav";

const ENQUIRY_LABEL: Record<string, string> = {
  interest: "Interest",
  question: "Question",
  document_request: "Document request",
  bid: "Bid",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
};

export default async function MyEnquiriesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/enquiries");
  }
  const userId = session.user.id;

  const rows = await db
    .select({ enquiry: enquiries, listing: listings, org: organizations })
    .from(enquiries)
    .innerJoin(listings, eq(enquiries.listingId, listings.id))
    .innerJoin(organizations, eq(listings.organizationId, organizations.id))
    .where(eq(enquiries.fromUserId, userId))
    .orderBy(desc(enquiries.updatedAt));

  return (
    <div className="appshell">
      <AppBar />
      <div className="obrowse">
        <DashboardNav active="enquiries" />
        <main className="obrowse-main">
          <p className="eyebrow">DASHBOARD</p>
          <h1 style={{ marginTop: 14, fontSize: "clamp(28px,3.4vw,38px)" }}>My enquiries</h1>
          <p style={{ marginTop: 10, color: "var(--on-bone-faint)" }}>
            Every enquiry you&rsquo;ve sent — express interest, questions and document requests. Full
            conversations live in{" "}
            <a href="/messages" style={{ textDecoration: "underline" }}>
              Messages
            </a>
            .
          </p>

          {rows.length === 0 ? (
            <div className="empty" style={{ marginTop: 32 }}>
              You haven&rsquo;t reached out on any listing yet.{" "}
              <a href="/opportunities">Browse opportunities</a> to find one.
            </div>
          ) : (
            <div className="dash-list" style={{ marginTop: 32 }}>
              {rows.map(({ enquiry, listing, org }) => (
                <a
                  key={enquiry.id}
                  href={`/messages?enquiry=${enquiry.id}`}
                  className="dash-row"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="dash-row-main">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span className="dash-row-title">{listing.title}</span>
                      <span className="badge">{ENQUIRY_LABEL[enquiry.type] ?? enquiry.type}</span>
                    </div>
                    <div className="dash-row-meta">
                      <span>{listing.isAnonymous ? "Anonymous developer" : org.name}</span>
                      <span>{STATUS_LABEL[enquiry.status] ?? enquiry.status}</span>
                      <span>Last activity {new Date(enquiry.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
