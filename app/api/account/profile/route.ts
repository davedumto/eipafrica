import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { firstName: rawFirstName, lastName: rawLastName, email: rawEmail, currentPassword } =
    body as Record<string, unknown>;
  const firstName = typeof rawFirstName === "string" ? rawFirstName.trim() : "";
  const lastName = typeof rawLastName === "string" ? rawLastName.trim() : "";
  const email = typeof rawEmail === "string" ? rawEmail.toLowerCase().trim() : "";
  const password = typeof currentPassword === "string" ? currentPassword : "";
  const name = [firstName, lastName].filter(Boolean).join(" ");

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Enter your current password to confirm this change." }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  if (email !== user.email) {
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
  }

  await db
    .update(users)
    .set({ name, firstName, lastName, email, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true, name, email });
}
