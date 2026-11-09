import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enquiries, listings, organizationMembers, users } from "@/lib/db/schema";
import { buildEmailTemplate, sendEmail } from "@/lib/email";
import { getPusherServer, enquiryChannelName } from "@/lib/pusher";
import { createNotification } from "@/lib/notifications";

const VALID_STATUSES = ["accepted", "declined"] as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = VALID_STATUSES.includes(body.status) ? body.status : null;
  if (!status) {
    return NextResponse.json({ error: "status must be accepted or declined." }, { status: 400 });
  }

  const [row] = await db
    .select({ enquiry: enquiries, listing: listings })
    .from(enquiries)
    .innerJoin(listings, eq(enquiries.listingId, listings.id))
    .where(eq(enquiries.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
  }

  const [membership] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, row.listing.organizationId), eq(organizationMembers.userId, session.user.id)))
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Only the listing owner can do this." }, { status: 403 });
  }

  if (row.enquiry.status !== "pending") {
    return NextResponse.json({ error: "This enquiry has already been actioned." }, { status: 409 });
  }

  await db.update(enquiries).set({ status, updatedAt: new Date() }).where(eq(enquiries.id, id));

  const pusher = getPusherServer();
  if (pusher) {
    await pusher.trigger(enquiryChannelName(id), "status-changed", { status });
  }

  const [sender] = await db
    .select({ id: users.id, email: users.email, emailAlertsEnabled: users.emailAlertsEnabled })
    .from(users)
    .where(eq(users.id, row.enquiry.fromUserId))
    .limit(1);
  if (sender) {
    if (sender.emailAlertsEnabled) {
      const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendEmail({
        to: sender.email,
        subject: `Your enquiry on "${row.listing.title}" was ${status}`,
        html: buildEmailTemplate({
          heading: status === "accepted" ? "Enquiry accepted" : "Enquiry declined",
          paragraphs: [`Your enquiry on <strong>${row.listing.title}</strong> has been ${status} by the owner.`],
          cta: { label: "View conversation", url: `${appUrl}/messages?enquiry=${id}` },
        }),
      });
    }

    await createNotification({
      userId: sender.id,
      type: status === "accepted" ? "enquiry_accepted" : "enquiry_declined",
      title: `Your enquiry on "${row.listing.title}" was ${status}`,
      linkUrl: `/messages?enquiry=${id}`,
    });
  }

  return NextResponse.json({ status });
}
