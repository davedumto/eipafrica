import { NextResponse } from "next/server";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { listings, users } from "@/lib/db/schema";
import { buildEmailTemplate, sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const REMINDER_WINDOW_DAYS = 3;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const due = await db
    .select()
    .from(listings)
    .where(
      and(
        eq(listings.status, "live"),
        isNull(listings.deadlineReminderSentAt),
        gte(listings.deadlineAt, now),
        lte(listings.deadlineAt, windowEnd),
      ),
    );

  let sent = 0;
  for (const listing of due) {
    const [owner] = await db.select().from(users).where(eq(users.id, listing.createdByUserId)).limit(1);
    if (!owner?.email) continue;

    const deadlineLabel = listing.deadlineAt ? new Date(listing.deadlineAt).toLocaleDateString() : "soon";

    if (owner.emailAlertsEnabled) {
      const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendEmail({
        to: owner.email,
        subject: `Deadline approaching for "${listing.title}"`,
        html: buildEmailTemplate({
          heading: "Deadline approaching",
          paragraphs: [`<strong>${listing.title}</strong> closes on ${deadlineLabel}. You can extend or close it out from your dashboard.`],
          cta: { label: "Go to dashboard", url: `${appUrl}/dashboard/listings` },
        }),
      }).catch((err) => console.error("[cron:deadline-reminders] email failed:", err));
    }

    await createNotification({
      userId: owner.id,
      type: "deadline_approaching",
      title: `"${listing.title}" closes on ${deadlineLabel}`,
      linkUrl: `/dashboard/listings`,
    });

    await db
      .update(listings)
      .set({ deadlineReminderSentAt: now })
      .where(eq(listings.id, listing.id));

    sent++;
  }

  return NextResponse.json({ ok: true, checked: due.length, sent });
}
