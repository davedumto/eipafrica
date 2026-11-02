import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [existing] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, id));

  return NextResponse.json({ ok: true });
}
