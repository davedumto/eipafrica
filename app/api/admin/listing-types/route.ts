import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listingTypes } from "@/lib/db/schema";
import type { FieldSchemaEntry } from "@/lib/listing-fields";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function validateFieldSchema(raw: unknown): FieldSchemaEntry[] | null {
  if (!Array.isArray(raw)) return null;
  const VALID_TYPES = new Set(["text", "textarea", "number", "currency", "date", "select", "multiselect", "repeater"]);
  const seenKeys = new Set<string>();
  const out: FieldSchemaEntry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const e = entry as Record<string, unknown>;
    if (typeof e.key !== "string" || !e.key.trim()) return null;
    if (typeof e.label !== "string" || !e.label.trim()) return null;
    if (typeof e.type !== "string" || !VALID_TYPES.has(e.type)) return null;
    if (seenKeys.has(e.key)) return null;
    seenKeys.add(e.key);
    const field: FieldSchemaEntry = { key: e.key, label: e.label, type: e.type as FieldSchemaEntry["type"] };
    if (e.type === "select") {
      if (!Array.isArray(e.options) || e.options.some((o) => typeof o !== "string")) return null;
      field.options = (e.options as string[]).map((o) => o.trim()).filter(Boolean);
    }
    if (e.type === "repeater") {
      if (!Array.isArray(e.fields) || e.fields.some((f) => typeof f !== "string")) return null;
      field.fields = (e.fields as string[]).map((f) => f.trim()).filter(Boolean);
    }
    out.push(field);
  }
  return out;
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
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const slug = typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "Could not derive a valid slug from that name." }, { status: 400 });
  }

  const fieldSchema = validateFieldSchema(body.fieldSchema ?? []);
  if (fieldSchema === null) {
    return NextResponse.json({ error: "Invalid field schema." }, { status: 400 });
  }

  const existing = await db.select({ id: listingTypes.id }).from(listingTypes).where(eq(listingTypes.slug, slug)).limit(1);
  if (existing.length) {
    return NextResponse.json({ error: `A listing type with slug "${slug}" already exists.` }, { status: 409 });
  }

  const [maxSort] = await db
    .select({ s: listingTypes.sortOrder })
    .from(listingTypes)
    .orderBy(desc(listingTypes.sortOrder))
    .limit(1);

  const [created] = await db
    .insert(listingTypes)
    .values({
      name,
      slug,
      fieldSchema,
      sortOrder: (maxSort?.s ?? 0) + 1,
      isActive: true,
    })
    .returning({ id: listingTypes.id });

  return NextResponse.json({ ok: true, id: created.id });
}
