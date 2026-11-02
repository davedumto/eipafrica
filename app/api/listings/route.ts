import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listings, organizationMembers } from "@/lib/db/schema";

async function currentOrgId(userId: string): Promise<string | null> {
  const [membership] = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);
  return membership?.organizationId ?? null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const organizationId = await currentOrgId(session.user.id);
  if (!organizationId) {
    return NextResponse.json({ error: "Join or create an organization first." }, { status: 400 });
  }

  const body = await req.json();
  const listingTypeId = typeof body.listingTypeId === "string" ? body.listingTypeId : null;
  if (!listingTypeId) {
    return NextResponse.json({ error: "listingTypeId is required." }, { status: 400 });
  }

  const [listing] = await db
    .insert(listings)
    .values({
      organizationId,
      createdByUserId: session.user.id,
      listingTypeId,
      title: "Untitled listing",
      summary: "",
      status: "draft",
    })
    .returning({ id: listings.id });

  return NextResponse.json(listing);
}
