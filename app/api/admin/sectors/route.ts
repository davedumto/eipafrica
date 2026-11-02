import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sectors } from "@/lib/db/schema";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const slug = typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : slugify(name);
  if (!slug) return NextResponse.json({ error: "Could not derive a valid slug from that name." }, { status: 400 });

  const parentId = typeof body.parentId === "string" && body.parentId ? body.parentId : null;
  if (parentId) {
    const [parent] = await db.select({ id: sectors.id }).from(sectors).where(eq(sectors.id, parentId)).limit(1);
    if (!parent) return NextResponse.json({ error: "Parent sector not found." }, { status: 400 });
  }

  const existing = await db.select({ id: sectors.id }).from(sectors).where(eq(sectors.slug, slug)).limit(1);
  if (existing.length) {
    return NextResponse.json({ error: `A sector with slug "${slug}" already exists.` }, { status: 409 });
  }

  const [created] = await db.insert(sectors).values({ name, slug, parentId, isActive: true }).returning({ id: sectors.id });

  return NextResponse.json({ ok: true, id: created.id });
}

export { slugify };
