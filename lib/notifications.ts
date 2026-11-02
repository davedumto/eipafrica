import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { getPusherServer, userChannelName } from "@/lib/pusher";

type NotificationType =
  | "new_enquiry"
  | "new_message"
  | "enquiry_accepted"
  | "enquiry_declined"
  | "listing_approved"
  | "listing_sent_back"
  | "org_verified"
  | "deadline_approaching";

export async function createNotification({
  userId,
  type,
  title,
  body,
  linkUrl,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
}) {
  const [created] = await db
    .insert(notifications)
    .values({ userId, type, title, body: body ?? null, linkUrl: linkUrl ?? null })
    .returning();

  const pusher = getPusherServer();
  if (pusher) {
    await pusher.trigger(userChannelName(userId), "new-notification", created);
  }

  return created;
}
