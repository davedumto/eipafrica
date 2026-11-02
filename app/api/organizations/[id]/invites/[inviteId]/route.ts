import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationInvites, organizationMembers } from "@/lib/db/schema";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> },
) {
  const { id, inviteId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, id),
        eq(organizationMembers.userId, session.user.id),
        eq(organizationMembers.role, "org_admin"),
      ),
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Only an organization admin can revoke invites." }, { status: 403 });
  }

  const [invite] = await db
    .select()
    .from(organizationInvites)
    .where(and(eq(organizationInvites.id, inviteId), eq(organizationInvites.organizationId, id)))
    .limit(1);

  if (!invite) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  await db.delete(organizationInvites).where(eq(organizationInvites.id, inviteId));

  return NextResponse.json({ ok: true });
}
