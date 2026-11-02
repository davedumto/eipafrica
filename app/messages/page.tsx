import { notFound, redirect } from "next/navigation";
import { desc, eq, inArray, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  enquiries,
  listings,
  messages,
  organizationMembers,
  organizations,
  users,
} from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import Thread from "./Thread";

export const instant = false;

const ENQUIRY_LABEL: Record<string, string> = {
  interest: "Interest",
  question: "Question",
  document_request: "Document request",
  bid: "Bid",
};

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ enquiry?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/messages");
  }
  const userId = session.user.id;
  const { enquiry: activeId } = await searchParams;

  const myOrgIds = (
    await db
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId))
  ).map((r) => r.organizationId);

  const ownerListingIds = myOrgIds.length
    ? (
        await db
          .select({ id: listings.id })
          .from(listings)
          .where(inArray(listings.organizationId, myOrgIds))
      ).map((r) => r.id)
    : [];

  const visibilityClause = ownerListingIds.length
    ? or(eq(enquiries.fromUserId, userId), inArray(enquiries.listingId, ownerListingIds))
    : eq(enquiries.fromUserId, userId);

  const rows = await db
    .select({
      enquiry: enquiries,
      listing: listings,
      fromUser: users,
      ownerOrg: organizations,
    })
    .from(enquiries)
    .innerJoin(listings, eq(enquiries.listingId, listings.id))
    .innerJoin(users, eq(enquiries.fromUserId, users.id))
    .innerJoin(organizations, eq(listings.organizationId, organizations.id))
    .where(visibilityClause!)
    .orderBy(desc(enquiries.updatedAt));

  if (rows.length === 0) {
    return (
      <div className="appshell">
        <AppBar />
        <div className="obrowse">
          <main className="obrowse-main" style={{ marginLeft: 0, maxWidth: 640 }}>
            <p className="eyebrow">MESSAGES</p>
            <h1 style={{ marginTop: 14, fontSize: "clamp(28px,3.4vw,38px)" }}>No conversations yet</h1>
            <p style={{ marginTop: 14, color: "var(--on-bone-faint)" }}>
              When you express interest, ask a question or request documents on a listing — or someone does on
              yours — the conversation will show up here.
            </p>
          </main>
        </div>
      </div>
    );
  }

  const conversations = rows.map((r) => ({
    id: r.enquiry.id,
    listingId: r.listing.id,
    listingTitle: r.listing.title,
    type: r.enquiry.type,
    status: r.enquiry.status,
    isOwner: ownerListingIds.includes(r.listing.id),
    otherParty: ownerListingIds.includes(r.listing.id) ? r.fromUser.name : r.ownerOrg.name,
    updatedAt: r.enquiry.updatedAt.toISOString(),
  }));

  const selected = activeId ? conversations.find((c) => c.id === activeId) : conversations[0];
  if (activeId && !selected) notFound();
  const activeConversation = selected ?? conversations[0];

  const lastMessages = await db
    .select({ enquiryId: messages.enquiryId, body: messages.body, createdAt: messages.createdAt })
    .from(messages)
    .where(inArray(messages.enquiryId, conversations.map((c) => c.id)))
    .orderBy(desc(messages.createdAt));

  const lastMessageByEnquiry = new Map<string, { body: string; createdAt: Date }>();
  for (const m of lastMessages) {
    if (!lastMessageByEnquiry.has(m.enquiryId)) {
      lastMessageByEnquiry.set(m.enquiryId, { body: m.body, createdAt: m.createdAt });
    }
  }

  const threadMessages = await db
    .select({ message: messages, fromUser: users })
    .from(messages)
    .innerJoin(users, eq(messages.fromUserId, users.id))
    .where(eq(messages.enquiryId, activeConversation.id))
    .orderBy(messages.createdAt);

  return (
    <div className="appshell">
      <AppBar />
      <div className="obrowse">
        <aside className="ofilters inbox-list">
          <div className="ofilters-head">
            <h2>Messages</h2>
          </div>
          <div className="inbox-rows">
            {conversations.map((c) => {
              const last = lastMessageByEnquiry.get(c.id);
              return (
                <a
                  key={c.id}
                  href={`/messages?enquiry=${c.id}`}
                  className={`inbox-row${c.id === activeConversation.id ? " active" : ""}`}
                >
                  <div className="inbox-row-top">
                    <span className="inbox-row-party">{c.otherParty}</span>
                    <span className={`badge inbox-type-badge`}>{ENQUIRY_LABEL[c.type] ?? c.type}</span>
                  </div>
                  <p className="inbox-row-listing">{c.listingTitle}</p>
                  {last && <p className="inbox-row-preview">{last.body}</p>}
                  <span className="inbox-row-status">{c.status}</span>
                </a>
              );
            })}
          </div>
        </aside>

        <main className="obrowse-main inbox-main">
          <Thread
            key={activeConversation.id}
            enquiryId={activeConversation.id}
            listingTitle={activeConversation.listingTitle}
            listingId={activeConversation.listingId}
            otherParty={activeConversation.otherParty}
            type={activeConversation.type}
            status={activeConversation.status}
            isOwner={activeConversation.isOwner}
            currentUserId={userId}
            initialMessages={threadMessages.map((m) => ({
              id: m.message.id,
              body: m.message.body,
              createdAt: m.message.createdAt.toISOString(),
              fromUserId: m.message.fromUserId,
              fromUserName: m.fromUser.name,
            }))}
          />
        </main>
      </div>
    </div>
  );
}
