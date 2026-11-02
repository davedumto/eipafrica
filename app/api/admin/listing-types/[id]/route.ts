import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listingTypes, listings } from "@/lib/db/schema";
import { slugify, validateFieldSchema } from "../route";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const [existing] = await db.select().from(listingTypes).where(eq(listingTypes.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Listing type not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if ("isActive" in body) {
    update.isActive = Boolean(body.isActive);
  }

  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    update.name = name;
  }

  if ("slug" in body) {
    const slug = slugify(String(body.slug ?? ""));
    if (!slug) return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
    if (slug !== existing.slug) {
      const clash = await db.select({ id: listingTypes.id }).from(listingTypes).where(eq(listingTypes.slug, slug)).limit(1);
      if (clash.length) {
        return NextResponse.json({ error: `A listing type with slug "${slug}" already exists.` }, { status: 409 });
      }
    }
    update.slug = slug;
  }

  if ("fieldSchema" in body) {
    const fieldSchema = validateFieldSchema(body.fieldSchema);
    if (fieldSchema === null) {
      return NextResponse.json({ error: "Invalid field schema." }, { status: 400 });
    }
    update.fieldSchema = fieldSchema;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  await db.update(listingTypes).set(update).where(eq(listingTypes.id, id));

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

  const [existing] = await db.select({ id: listingTypes.id }).from(listingTypes).where(eq(listingTypes.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Listing type not found." }, { status: 404 });
  }

  const inUse = await db.select({ id: listings.id }).from(listings).where(eq(listings.listingTypeId, id)).limit(1);
  if (inUse.length) {
    return NextResponse.json(
      { error: "This listing type is used by existing listings and can't be deleted. Deactivate it instead." },
      { status: 409 },
    );
  }

  await db.delete(listingTypes).where(eq(listingTypes.id, id));

  return NextResponse.json({ ok: true });
}
