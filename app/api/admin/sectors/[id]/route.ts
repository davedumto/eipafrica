import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sectors, listings } from "@/lib/db/schema";
import { slugify } from "../route";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const [existing] = await db.select().from(sectors).where(eq(sectors.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Sector not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if ("isActive" in body) update.isActive = Boolean(body.isActive);
  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    update.name = name;
  }
  if ("slug" in body) {
    const slug = slugify(String(body.slug ?? ""));
    if (!slug) return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
    if (slug !== existing.slug) {
      const clash = await db.select({ id: sectors.id }).from(sectors).where(eq(sectors.slug, slug)).limit(1);
      if (clash.length) {
        return NextResponse.json({ error: `A sector with slug "${slug}" already exists.` }, { status: 409 });
      }
    }
    update.slug = slug;
  }
  if ("parentId" in body) {
    const parentId = typeof body.parentId === "string" && body.parentId ? body.parentId : null;
    if (parentId === id) {
      return NextResponse.json({ error: "A sector can't be its own parent." }, { status: 400 });
    }
    if (parentId) {
      const [parent] = await db.select({ id: sectors.id }).from(sectors).where(eq(sectors.id, parentId)).limit(1);
      if (!parent) return NextResponse.json({ error: "Parent sector not found." }, { status: 400 });
    }
    update.parentId = parentId;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  await db.update(sectors).set(update).where(eq(sectors.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const [existing] = await db.select({ id: sectors.id }).from(sectors).where(eq(sectors.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Sector not found." }, { status: 404 });
  }

  const inUse = await db.select({ id: listings.id }).from(listings).where(eq(listings.sectorId, id)).limit(1);
  if (inUse.length) {
    return NextResponse.json(
      { error: "This sector is used by existing listings and can't be deleted. Deactivate it instead." },
      { status: 409 },
    );
  }

  // Child sectors pointing at this one have ON DELETE SET NULL, so deleting
  // a parent sector is safe — its children simply become top-level.
  await db.delete(sectors).where(eq(sectors.id, id));

  return NextResponse.json({ ok: true });
}
