import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { countries, listings } from "@/lib/db/schema";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const [existing] = await db.select().from(countries).where(eq(countries.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Country not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if ("isActive" in body) update.isActive = Boolean(body.isActive);
  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    update.name = name;
  }
  if ("region" in body) {
    update.region = typeof body.region === "string" ? body.region.trim() || null : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  await db.update(countries).set(update).where(eq(countries.id, id));

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

  const [existing] = await db.select({ id: countries.id }).from(countries).where(eq(countries.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Country not found." }, { status: 404 });
  }

  const inUse = await db
    .select({ id: listings.id })
    .from(listings)
    .where(sql`EXISTS (SELECT 1 FROM json_each(${listings.countryIds}) WHERE json_each.value = ${id})`)
    .limit(1);
  if (inUse.length) {
    return NextResponse.json(
      { error: "This country is used by existing listings and can't be deleted. Deactivate it instead." },
      { status: 409 },
    );
  }

  await db.delete(countries).where(eq(countries.id, id));

  return NextResponse.json({ ok: true });
}
