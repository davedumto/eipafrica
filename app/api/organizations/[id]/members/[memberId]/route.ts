import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id, memberId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Only an org_admin (not a regular member) can remove members.
  const [actingMembership] = await db
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

  if (!actingMembership) {
    return NextResponse.json({ error: "Only an organization admin can remove members." }, { status: 403 });
  }

  const [target] = await db
    .select()
    .from(organizationMembers)
    .where(and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, id)))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  if (target.userId === session.user.id) {
    return NextResponse.json({ error: "You can't remove yourself from the organization." }, { status: 400 });
  }

  if (target.role === "org_admin") {
    const admins = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, id), eq(organizationMembers.role, "org_admin")));
    if (admins.length <= 1) {
      return NextResponse.json({ error: "An organization must have at least one admin." }, { status: 400 });
    }
  }

  await db.delete(organizationMembers).where(eq(organizationMembers.id, memberId));

  return NextResponse.json({ ok: true });
}
