import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { countries } from "@/lib/db/schema";

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
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const region = typeof body.region === "string" ? body.region.trim() || null : null;

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!/^[A-Z]{2}$/.test(code)) {
    return NextResponse.json({ error: "Code must be a 2-letter ISO country code (e.g. NG)." }, { status: 400 });
  }

  const existing = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, code)).limit(1);
  if (existing.length) {
    return NextResponse.json({ error: `A country with code "${code}" already exists.` }, { status: 409 });
  }

  const [created] = await db.insert(countries).values({ name, code, region, isActive: true }).returning({ id: countries.id });

  return NextResponse.json({ ok: true, id: created.id });
}
