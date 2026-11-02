import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizations, organizationMembers } from "@/lib/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
  }

  const [org] = await db
    .insert(organizations)
    .values({
      name,
      description: typeof body.description === "string" ? body.description.trim() : null,
      website: typeof body.website === "string" ? body.website.trim() : null,
    })
    .returning({ id: organizations.id, name: organizations.name });

  await db.insert(organizationMembers).values({
    organizationId: org.id,
    userId: session.user.id,
    role: "org_admin",
  });

  return NextResponse.json(org);
}
