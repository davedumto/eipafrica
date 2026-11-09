import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enquiries, listings, messages, organizationMembers, users } from "@/lib/db/schema";
import { buildEmailTemplate, sendEmail } from "@/lib/email";
import { getPusherServer, enquiryChannelName } from "@/lib/pusher";
import { createNotification } from "@/lib/notifications";

async function loadParticipant(enquiryId: string, userId: string) {
  const [row] = await db
    .select({
      enquiry: enquiries,
      listing: listings,
    })
    .from(enquiries)
    .innerJoin(listings, eq(enquiries.listingId, listings.id))
    .where(eq(enquiries.id, enquiryId))
    .limit(1);

  if (!row) return null;

  const isSender = row.enquiry.fromUserId === userId;
  const [membership] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, row.listing.organizationId), eq(organizationMembers.userId, userId)))
    .limit(1);
  const isOwnerOrg = Boolean(membership);

  if (!isSender && !isOwnerOrg) return null;

  return { enquiry: row.enquiry, listing: row.listing, isSender, isOwnerOrg };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const participant = await loadParticipant(id, session.user.id);
  if (!participant) {
    return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Message body is required." }, { status: 400 });
  }

  const [created] = await db
    .insert(messages)
    .values({ enquiryId: id, fromUserId: session.user.id, body: text })
    .returning();

  await db.update(enquiries).set({ updatedAt: new Date() }).where(eq(enquiries.id, id));

  const pusher = getPusherServer();
  if (pusher) {
    await pusher.trigger(enquiryChannelName(id), "new-message", {
      id: created.id,
      body: text,
      createdAt: created.createdAt,
      fromUserId: session.user.id,
      fromUserName: session.user.name ?? "Someone",
    });
  }

  // Notify the other participant (not the sender of this message).
  let recipient: { id: string; email: string; emailAlertsEnabled: boolean } | null = null;
  if (participant.isSender) {
    const [owner] = await db
      .select({ id: users.id, email: users.email, emailAlertsEnabled: users.emailAlertsEnabled })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(and(eq(organizationMembers.organizationId, participant.listing.organizationId), eq(organizationMembers.role, "org_admin")))
      .limit(1);
    recipient = owner ?? null;
  } else {
    const [sender] = await db
      .select({ id: users.id, email: users.email, emailAlertsEnabled: users.emailAlertsEnabled })
      .from(users)
      .where(eq(users.id, participant.enquiry.fromUserId))
      .limit(1);
    recipient = sender ?? null;
  }

  if (recipient) {
    if (recipient.emailAlertsEnabled) {
      const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendEmail({
        to: recipient.email,
        subject: `New reply on "${participant.listing.title}"`,
        html: buildEmailTemplate({
          heading: "New reply",
          paragraphs: [`You have a new reply on your conversation about <strong>${participant.listing.title}</strong>.`],
          quote: { from: session.user.name ?? "Someone", body: text },
          cta: { label: "View conversation", url: `${appUrl}/messages?enquiry=${id}` },
        }),
      });
    }

    await createNotification({
      userId: recipient.id,
      type: "new_message",
      title: `New reply on "${participant.listing.title}"`,
      body: text,
      linkUrl: `/messages?enquiry=${id}`,
    });
  }

  return NextResponse.json({ id: created.id, createdAt: created.createdAt });
}
