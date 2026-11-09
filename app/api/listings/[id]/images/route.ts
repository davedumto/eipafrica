import { NextResponse } from "next/server";
import { and, asc, count, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listingImages, listings, organizationMembers } from "@/lib/db/schema";
import { getCloudinary } from "@/lib/cloudinary";

const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGES_PER_LISTING = 10;

async function requireListingAccess(id: string, userId: string) {
  const [listing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!listing) return { error: "Listing not found.", status: 404 as const };

  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(eq(organizationMembers.organizationId, listing.organizationId), eq(organizationMembers.userId, userId)),
    )
    .limit(1);

  if (!membership) return { error: "Not authorized.", status: 403 as const };

  // A draft is private to whoever created it until it's submitted for review.
  if (listing.status === "draft" && listing.createdByUserId !== userId) {
    return { error: "Not authorized.", status: 403 as const };
  }

  return { listing };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const access = await requireListingAccess(id, session.user.id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const images = await db
    .select()
    .from(listingImages)
    .where(eq(listingImages.listingId, id))
    .orderBy(asc(listingImages.sortOrder), asc(listingImages.createdAt));

  return NextResponse.json(images);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const cloudinary = getCloudinary();
  if (!cloudinary) {
    return NextResponse.json(
      { error: "Image storage is not yet configured. Images can be added once storage is enabled." },
      { status: 503 },
    );
  }

  const access = await requireListingAccess(id, session.user.id);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const [{ n: existingCount }] = await db
    .select({ n: count() })
    .from(listingImages)
    .where(eq(listingImages.listingId, id));

  if (existingCount >= MAX_IMAGES_PER_LISTING) {
    return NextResponse.json(
      { error: `You can add up to ${MAX_IMAGES_PER_LISTING} images per listing.` },
      { status: 400 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "An image file is required." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Images must be 3MB or smaller." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPG and WEBP images are allowed." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const uploadResult = await new Promise<{ public_id: string; secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `listings/${id}`, resource_type: "image" },
      (err, result) => {
        if (err || !result) reject(err ?? new Error("Upload failed."));
        else resolve(result);
      },
    );
    stream.end(buffer);
  }).catch((err) => {
    console.error("[listing images] cloudinary upload failed:", err);
    return null;
  });

  if (!uploadResult) {
    return NextResponse.json({ error: "Could not upload this image. Try again." }, { status: 502 });
  }

  const [image] = await db
    .insert(listingImages)
    .values({
      listingId: id,
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url,
      sortOrder: existingCount,
      uploadedByUserId: session.user.id,
    })
    .returning();

  return NextResponse.json(image);
}
