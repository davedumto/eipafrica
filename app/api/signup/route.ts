import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildEmailTemplate, sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { firstName: rawFirstName, lastName: rawLastName, email: rawEmail, password: rawPassword } =
    body as Record<string, unknown>;
  const firstName = typeof rawFirstName === "string" ? rawFirstName.trim() : "";
  const lastName = typeof rawLastName === "string" ? rawLastName.trim() : "";
  const email = typeof rawEmail === "string" ? rawEmail.toLowerCase().trim() : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const name = [firstName, lastName].filter(Boolean).join(" ");

  if (!firstName || !lastName || !email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "First name, last name, email and a password of at least 8 characters are required." },
      { status: 400 },
    );
  }

  try {
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Email verification is stubbed for now: users are created pre-verified
    // (emailVerified set immediately) so signup -> org creation -> login works
    // end-to-end without a real mail flow. A verification-link flow can be
    // wired in later using sendEmail() below, which already logs to console
    // in dev when SMTP env vars are absent.
    const [created] = await db
      .insert(users)
      .values({
        name,
        firstName,
        lastName,
        email,
        passwordHash,
        emailVerified: new Date(),
      })
      .returning({ id: users.id, email: users.email, name: users.name });

    // Best-effort welcome email: a mail-sending failure should never fail signup,
    // since the account is already created at this point.
    try {
      const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendEmail({
        to: created.email,
        subject: "Welcome to EIP Africa",
        html: buildEmailTemplate({
          heading: `Welcome, ${created.name}`,
          paragraphs: ["Your account is ready. Browse live opportunities or post your own listing to get started."],
          cta: { label: "Browse opportunities", url: `${appUrl}/opportunities` },
        }),
      });
    } catch (emailError) {
      console.error("[signup] welcome email failed:", emailError);
    }

    return NextResponse.json({ id: created.id, email: created.email, name: created.name });
  } catch (error) {
    console.error("[signup] failed:", error);
    return NextResponse.json({ error: "Something went wrong creating your account." }, { status: 500 });
  }
}
