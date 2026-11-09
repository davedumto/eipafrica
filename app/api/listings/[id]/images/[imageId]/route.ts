import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listingImages, listings, organizationMembers } from "@/lib/db/schema";
import { getCloudinary } from "@/lib/cloudinary";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  const { id, imageId } = await params;
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

  const [image] = await db
    .select()
    .from(listingImages)
    .where(and(eq(listingImages.id, imageId), eq(listingImages.listingId, id)))
    .limit(1);

  if (!image) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  const cloudinary = getCloudinary();
  if (cloudinary) {
    try {
      await cloudinary.uploader.destroy(image.publicId);
    } catch (error) {
      // Don't block removing the DB record if the Cloudinary asset is already
      // gone — just log it, the row delete below still cleans up the gallery.
      console.error("[listing images] cloudinary delete failed:", error);
    }
  }

  await db.delete(listingImages).where(eq(listingImages.id, imageId));

  return NextResponse.json({ ok: true });
}
