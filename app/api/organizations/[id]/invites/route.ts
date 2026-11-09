import { NextResponse } from "next/server";
import crypto from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationInvites, organizationMembers, organizations, users } from "@/lib/db/schema";
import { buildEmailTemplate, sendEmail } from "@/lib/email";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function requireOrgAdmin(organizationId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.role, "org_admin"),
      ),
    )
    .limit(1);
  return Boolean(membership);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!(await requireOrgAdmin(id, session.user.id))) {
    return NextResponse.json({ error: "Only an organization admin can view invites." }, { status: 403 });
  }

  const pending = await db
    .select({
      id: organizationInvites.id,
      email: organizationInvites.email,
      role: organizationInvites.role,
      expiresAt: organizationInvites.expiresAt,
      createdAt: organizationInvites.createdAt,
    })
    .from(organizationInvites)
    .where(and(eq(organizationInvites.organizationId, id), isNull(organizationInvites.acceptedAt)))
    .orderBy(organizationInvites.createdAt);

  return NextResponse.json({ invites: pending });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!(await requireOrgAdmin(id, session.user.id))) {
    return NextResponse.json({ error: "Only an organization admin can invite members." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  if (!org) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) {
    const [alreadyMember] = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(eq(organizationMembers.organizationId, id), eq(organizationMembers.userId, existingUser.id)),
      )
      .limit(1);
    if (alreadyMember) {
      return NextResponse.json({ error: "This person is already a member of your organization." }, { status: 409 });
    }
  }

  // Resend: reuse an existing pending invite for this email instead of stacking duplicates.
  const [existingInvite] = await db
    .select()
    .from(organizationInvites)
    .where(
      and(
        eq(organizationInvites.organizationId, id),
        eq(organizationInvites.email, email),
        isNull(organizationInvites.acceptedAt),
      ),
    )
    .limit(1);

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  if (existingInvite) {
    await db
      .update(organizationInvites)
      .set({ tokenHash, expiresAt, invitedByUserId: session.user.id })
      .where(eq(organizationInvites.id, existingInvite.id));
  } else {
    await db.insert(organizationInvites).values({
      organizationId: id,
      email,
      invitedByUserId: session.user.id,
      tokenHash,
      expiresAt,
    });
  }

  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const acceptUrl = `${appUrl}/invite/accept?token=${rawToken}`;

  await sendEmail({
    to: email,
    subject: `You've been invited to join ${org.name} on EIP Africa`,
    html: buildEmailTemplate({
      heading: "You've been invited",
      paragraphs: [
        `${session.user.name ?? "Someone"} invited you to join <strong>${org.name}</strong> on EIP Africa.`,
      ],
      cta: { label: "Accept invite", url: acceptUrl },
      footnote: "This invite expires in 7 days.",
    }),
  });

  return NextResponse.json({ ok: true, email });
}
