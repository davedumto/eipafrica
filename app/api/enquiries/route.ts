import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enquiries, listings, messages, organizationMembers, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const VALID_TYPES = ["interest", "question", "document_request", "bid"] as const;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json();
  const listingId = typeof body.listingId === "string" ? body.listingId : "";
  const type = VALID_TYPES.includes(body.type) ? body.type : null;
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!listingId || !type) {
    return NextResponse.json({ error: "listingId and a valid type are required." }, { status: 400 });
  }

  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!listing || listing.status !== "live") {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const [enquiry] = await db
    .insert(enquiries)
    .values({ listingId, fromUserId: session.user.id, type })
    .returning();

  if (message) {
    await db.insert(messages).values({
      enquiryId: enquiry.id,
      fromUserId: session.user.id,
      body: message,
    });
  }

  const [owner] = await db
    .select({ id: users.id, email: users.email, emailAlertsEnabled: users.emailAlertsEnabled })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(and(eq(organizationMembers.organizationId, listing.organizationId), eq(organizationMembers.role, "org_admin")))
    .limit(1);

  if (owner) {
    if (owner.emailAlertsEnabled) {
      await sendEmail({
        to: owner.email,
        subject: `New ${type.replace("_", " ")} on "${listing.title}"`,
        html: `<p>You have a new enquiry on your listing "${listing.title}".</p>${message ? `<p>${message}</p>` : ""}`,
      });
    }

    await createNotification({
      userId: owner.id,
      type: "new_enquiry",
      title: `New ${type.replace("_", " ")} on "${listing.title}"`,
      body: message || undefined,
      linkUrl: `/messages?enquiry=${enquiry.id}`,
    });
  }

  return NextResponse.json({ id: enquiry.id });
}
