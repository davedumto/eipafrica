import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { savedListings } from "@/lib/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { listingId } = await req.json();
  if (typeof listingId !== "string") {
    return NextResponse.json({ error: "listingId is required." }, { status: 400 });
  }

  const existing = await db
    .select({ id: savedListings.id })
    .from(savedListings)
    .where(and(eq(savedListings.userId, session.user.id), eq(savedListings.listingId, listingId)))
    .limit(1);

  if (existing.length) {
    await db.delete(savedListings).where(eq(savedListings.id, existing[0].id));
    return NextResponse.json({ saved: false });
  }

  await db.insert(savedListings).values({ userId: session.user.id, listingId });
  return NextResponse.json({ saved: true });
}
