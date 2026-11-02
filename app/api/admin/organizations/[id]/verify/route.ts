import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizations, organizationMembers } from "@/lib/db/schema";
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

  const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  if (!org) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const verified = Boolean(body.verified);

  await db
    .update(organizations)
    .set({
      isVerified: verified,
      verifiedAt: verified ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, id));

  if (verified) {
    const members = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, id));

    await Promise.all(
      members.map((m) =>
        createNotification({
          userId: m.userId,
          type: "org_verified",
          title: `${org.name} is now a verified organization`,
          linkUrl: `/dashboard/listings`,
        }),
      ),
    );
  }

  return NextResponse.json({ ok: true, isVerified: verified });
}
