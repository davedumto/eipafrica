import { NextResponse } from "next/server";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { buildEmailTemplate, sendEmail } from "@/lib/email";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawEmail = (body as Record<string, unknown>).email;
  const email = typeof rawEmail === "string" ? rawEmail.toLowerCase().trim() : "";

  // Always respond the same way whether or not the email exists, so this
  // endpoint can't be used to enumerate registered accounts.
  const genericResponse = NextResponse.json({
    ok: true,
    message: "If that email has an account, we've sent a password reset link.",
  });

  if (!email) return genericResponse;

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return genericResponse;

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your EIP Africa password",
      html: buildEmailTemplate({
        heading: "Reset your password",
        paragraphs: [`Hi ${user.name}, click below to choose a new password.`],
        cta: { label: "Reset password", url: resetUrl },
        footnote: "This link expires in 1 hour. If you didn't request this, you can ignore this email.",
      }),
    });
  } catch (error) {
    console.error("[forgot-password] failed:", error);
    // Still return the generic response — don't leak whether something broke.
  }

  return genericResponse;
}
