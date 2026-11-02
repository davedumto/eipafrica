import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listingDocuments, listings, organizationMembers } from "@/lib/db/schema";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_EXTENSIONS = [".pdf", ".xlsx", ".xls", ".csv", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Document storage is not yet configured. Documents can be added once storage is enabled." },
      { status: 503 },
    );
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

  const { put } = await import("@vercel/blob");
  const form = await req.formData();
  const file = form.get("file");
  const tag = form.get("tag") === "confidential" ? "confidential" : "public";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Files must be 25MB or smaller." }, { status: 400 });
  }

  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
      { status: 400 },
    );
  }

  const blob = await put(`listings/${id}/${randomUUID()}-${file.name}`, file, { access: "private" });

  const [doc] = await db
    .insert(listingDocuments)
    .values({
      listingId: id,
      url: blob.url,
      filename: file.name,
      tag,
      uploadedByUserId: session.user.id,
    })
    .returning();

  return NextResponse.json(doc);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  // A draft is private to whoever created it until it's submitted for review.
  if (listing.status === "draft" && listing.createdByUserId !== session.user.id) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const docs = await db.select().from(listingDocuments).where(eq(listingDocuments.listingId, id));
  return NextResponse.json(docs);
}
