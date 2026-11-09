import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listings, organizationMembers } from "@/lib/db/schema";

const EDITABLE_FIELDS = [
  "title",
  "summary",
  "description",
  "sectorId",
  "countryIds",
  "region",
  "city",
  "dealSizeAmount",
  "dealSizeCurrency",
  "dealSizeUsd",
  "projectStage",
  "deadlineAt",
  "visibility",
  "isAnonymous",
  "extraFields",
  "tags",
] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [listing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, listing.organizationId),
        eq(organizationMembers.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Not authorized to edit this listing." }, { status: 403 });
  }

  // A draft is private to whoever created it until it's submitted for review.
  if (listing.status === "draft" && listing.createdByUserId !== session.user.id) {
    return NextResponse.json({ error: "Not authorized to edit this listing." }, { status: 403 });
  }

  if (listing.status !== "draft" && listing.status !== "pending_review" && listing.status !== "live") {
    return NextResponse.json({ error: "This listing can no longer be edited here." }, { status: 400 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in body) update[key] = body[key];
  }

  // JSON has no Date type — deadlineAt arrives as an ISO string (or null)
  // and must be converted to a real Date before Drizzle's timestamp column
  // can serialize it (it calls .toISOString() on the value internally).
  if ("deadlineAt" in update) {
    update.deadlineAt = update.deadlineAt ? new Date(update.deadlineAt as string) : null;
  }

  if (body.submit === true) {
    const finalTitle = (update.title as string | undefined) ?? listing.title;
    const finalSummary = (update.summary as string | undefined) ?? listing.summary;
    if (!finalTitle || finalTitle === "Untitled listing" || !finalSummary) {
      return NextResponse.json(
        { error: "Title and short summary are required before submitting." },
        { status: 400 },
      );
    }
    update.status = "pending_review";
  } else if (listing.status === "live") {
    // Editing a live listing pulls it back into review — the admin's
    // original approval covered the previous version, not this edit, so it
    // comes off the public site until re-approved rather than silently
    // changing underneath that approval.
    update.status = "pending_review";
  }

  update.updatedAt = new Date();

  await db.update(listings).set(update).where(eq(listings.id, id));

  return NextResponse.json({ ok: true, status: update.status ?? listing.status });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [listing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, listing.organizationId),
        eq(organizationMembers.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Not authorized to delete this listing." }, { status: 403 });
  }

  // A draft is private to whoever created it until it's submitted for review.
  if (listing.status === "draft" && listing.createdByUserId !== session.user.id) {
    return NextResponse.json({ error: "Not authorized to delete this listing." }, { status: 403 });
  }

  // Only drafts and pending-review listings can be deleted outright — once a
  // listing has been live it may carry real enquiries/history, so the owner
  // path for that is Close (status change), not deletion.
  if (listing.status !== "draft" && listing.status !== "pending_review") {
    return NextResponse.json(
      { error: "Only draft or pending-review listings can be deleted. Close a live listing instead." },
      { status: 400 },
    );
  }

  await db.delete(listings).where(eq(listings.id, id));

  return NextResponse.json({ ok: true });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [listing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!listing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, listing.organizationId),
        eq(organizationMembers.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  // A draft is private to whoever created it until it's submitted for review.
  if (listing.status === "draft" && listing.createdByUserId !== session.user.id) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  return NextResponse.json(listing);
}
