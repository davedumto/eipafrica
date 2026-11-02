import { NextResponse } from "next/server";
import crypto from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationInvites, organizationMembers, organizations, users } from "@/lib/db/schema";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ error: "Missing invite token." }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const [invite] = await db
    .select()
    .from(organizationInvites)
    .where(and(eq(organizationInvites.tokenHash, tokenHash), isNull(organizationInvites.acceptedAt)))
    .limit(1);

  if (!invite) {
    return NextResponse.json({ error: "This invite link is invalid or has already been used." }, { status: 400 });
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This invite has expired. Ask an admin to resend it." }, { status: 400 });
  }

  const [currentUser] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!currentUser || currentUser.email.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: `This invite is for ${invite.email}. Log in with that email to accept it.` },
      { status: 403 },
    );
  }

  const [alreadyMember] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, invite.organizationId),
        eq(organizationMembers.userId, currentUser.id),
      ),
    )
    .limit(1);

  if (!alreadyMember) {
    await db.insert(organizationMembers).values({
      organizationId: invite.organizationId,
      userId: currentUser.id,
      role: invite.role,
    });
  }

  await db
    .update(organizationInvites)
    .set({ acceptedAt: new Date() })
    .where(eq(organizationInvites.id, invite.id));

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, invite.organizationId))
    .limit(1);

  return NextResponse.json({ ok: true, organization: org });
}
