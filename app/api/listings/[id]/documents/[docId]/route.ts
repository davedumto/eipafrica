import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listingDocuments, listings, organizationMembers } from "@/lib/db/schema";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;
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
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  // A draft is private to whoever created it until it's submitted for review.
  if (listing.status === "draft" && listing.createdByUserId !== session.user.id) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const [doc] = await db
    .select()
    .from(listingDocuments)
    .where(and(eq(listingDocuments.id, docId), eq(listingDocuments.listingId, id)))
    .limit(1);

  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { del } = await import("@vercel/blob");
      await del(doc.url);
    } catch (error) {
      // Don't block removing the DB record if the blob is already gone —
      // just log it, the row delete below still cleans up the listing's doc list.
      console.error("[documents] blob delete failed:", error);
    }
  }

  await db.delete(listingDocuments).where(eq(listingDocuments.id, docId));

  return NextResponse.json({ ok: true });
}
