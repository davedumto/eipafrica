import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listings, organizationMembers } from "@/lib/db/schema";

// Owner-controlled transitions only. Pending_review -> live is an admin
// action (approval), not exposed here. Draft -> pending_review happens via
// the wizard's submit flow (app/api/listings/[id]/route.ts), not here.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  live: ["paused", "closed"],
  paused: ["live", "closed"],
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [listing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, listing.organizationId),
        eq(organizationMembers.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Not authorized to change this listing's status." }, { status: 403 });
  }

  const body = await req.json();
  const nextStatus = body.status as string | undefined;

  const allowedFrom = ALLOWED_TRANSITIONS[listing.status];
  if (!allowedFrom || !nextStatus || !allowedFrom.includes(nextStatus)) {
    return NextResponse.json(
      { error: `Cannot move a listing from "${listing.status}" to "${nextStatus}".` },
      { status: 400 },
    );
  }

  await db
    .update(listings)
    .set({ status: nextStatus as typeof listing.status, updatedAt: new Date() })
    .where(eq(listings.id, id));

  return NextResponse.json({ ok: true, status: nextStatus });
}
