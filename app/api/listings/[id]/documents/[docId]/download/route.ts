import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documentDownloads, enquiries, listingDocuments, listings, organizationMembers } from "@/lib/db/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    const loginUrl = new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000");
    loginUrl.searchParams.set("next", `/opportunities/${id}`);
    return NextResponse.redirect(loginUrl);
  }

  const [doc] = await db
    .select()
    .from(listingDocuments)
    .where(and(eq(listingDocuments.id, docId), eq(listingDocuments.listingId, id)))
    .limit(1);
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const [listing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  // A draft is private to whoever created it until it's submitted for review.
  if (listing.status === "draft" && listing.createdByUserId !== session.user.id) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
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
  const isOwner = Boolean(membership);

  if (doc.tag === "confidential" && !isOwner) {
    // Confidential documents require an accepted document-request enquiry
    // from this user on this listing — never just "logged in".
    const [accepted] = await db
      .select()
      .from(enquiries)
      .where(
        and(
          eq(enquiries.listingId, id),
          eq(enquiries.fromUserId, session.user.id),
          eq(enquiries.type, "document_request"),
          eq(enquiries.status, "accepted"),
        ),
      )
      .limit(1);

    if (!accepted) {
      return NextResponse.json(
        { error: "This document is confidential. Request access from the listing owner first." },
        { status: 403 },
      );
    }
  }

  await db.insert(documentDownloads).values({ documentId: doc.id, userId: session.user.id });

  // Blobs are stored as access:"private" — the stored URL isn't directly
  // fetchable by the browser, so fetch the content server-side (using our
  // own BLOB_READ_WRITE_TOKEN) and stream it back through this route.
  const { get } = await import("@vercel/blob");
  const blob = await get(doc.url, { access: "private" });
  if (!blob) {
    return NextResponse.json({ error: "File is no longer available." }, { status: 404 });
  }

  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": blob.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${doc.filename.replace(/"/g, "")}"`,
    },
  });
}
