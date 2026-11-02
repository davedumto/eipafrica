import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (target.id === session.user.id) {
    return NextResponse.json({ error: "You can't change your own admin status." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const isAdmin = Boolean(body.isAdmin);
  const confirmEmail = typeof body.confirmEmail === "string" ? body.confirmEmail.toLowerCase().trim() : "";

  if (isAdmin && confirmEmail !== target.email.toLowerCase()) {
    return NextResponse.json({ error: "Email confirmation did not match." }, { status: 400 });
  }

  await db.update(users).set({ isAdmin, updatedAt: new Date() }).where(eq(users.id, id));

  return NextResponse.json({ ok: true, isAdmin });
}
