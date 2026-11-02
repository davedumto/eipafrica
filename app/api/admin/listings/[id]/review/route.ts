import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listings, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const [listing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }
  if (listing.status !== "pending_review") {
    return NextResponse.json({ error: "This listing is not awaiting review." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action as "approve" | "send_back" | undefined;
  const comments = typeof body.comments === "string" ? body.comments.trim() : "";

  if (action !== "approve" && action !== "send_back") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }
  if (action === "send_back" && !comments) {
    return NextResponse.json({ error: "Comments are required to send a listing back." }, { status: 400 });
  }

  await db
    .update(listings)
    .set({
      status: action === "approve" ? "live" : "draft",
      reviewComments: comments || null,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(listings.id, id));

  const [owner] = await db.select().from(users).where(eq(users.id, listing.createdByUserId)).limit(1);

  if (owner?.email) {
    if (action === "approve") {
      if (owner.emailAlertsEnabled) {
        await sendEmail({
          to: owner.email,
          subject: `Your listing "${listing.title}" is now live`,
          html: `<p>Good news — <strong>${listing.title}</strong> has been approved and is now live on EIP Africa.</p>`,
        }).catch((err) => console.error("[admin review] approve email failed:", err));
      }

      await createNotification({
        userId: owner.id,
        type: "listing_approved",
        title: `Your listing "${listing.title}" is now live`,
        linkUrl: `/opportunities/${id}`,
      });
    } else {
      if (owner.emailAlertsEnabled) {
        await sendEmail({
          to: owner.email,
          subject: `Your listing "${listing.title}" needs a few changes`,
          html: `<p>Your listing <strong>${listing.title}</strong> was sent back to draft by our review team.</p><p>${comments}</p><p>You can update and resubmit it from your dashboard.</p>`,
        }).catch((err) => console.error("[admin review] send-back email failed:", err));
      }

      await createNotification({
        userId: owner.id,
        type: "listing_sent_back",
        title: `Your listing "${listing.title}" needs a few changes`,
        body: comments,
        linkUrl: `/listings/${id}/edit`,
      });
    }
  }

  return NextResponse.json({ ok: true, status: action === "approve" ? "live" : "draft" });
}
