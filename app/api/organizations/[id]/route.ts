import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizations, organizationMembers } from "@/lib/db/schema";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  if (!org) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  // Only an org_admin (not a regular member) can edit organization settings.
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
    return NextResponse.json({ error: "Only an organization admin can edit this." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
  }
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const website = typeof body.website === "string" ? body.website.trim() : "";

  await db
    .update(organizations)
    .set({
      name,
      description: description || null,
      website: website || null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, id));

  return NextResponse.json({ ok: true, name, description: description || null, website: website || null });
}
