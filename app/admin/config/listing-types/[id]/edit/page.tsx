import { notFound, redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listingTypes, listings } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import ListingTypeForm from "@/app/admin/config/ListingTypeForm";
import type { FieldSchemaEntry } from "@/lib/listing-fields";

export default async function EditListingTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?next=/admin/config/listing-types/${id}/edit`);
  if (!session.user.isAdmin) redirect("/opportunities");

  const [type] = await db.select().from(listingTypes).where(eq(listingTypes.id, id)).limit(1);
  if (!type) notFound();

  const [usage] = await db.select({ n: count() }).from(listings).where(eq(listings.listingTypeId, id));

  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in">
          <p className="eyebrow">ADMIN</p>
          <h1 style={{ marginTop: 14, marginBottom: 32, fontSize: "clamp(32px,4vw,44px)" }}>Edit listing type</h1>
          <ListingTypeForm
            mode="edit"
            id={type.id}
            initialName={type.name}
            initialSlug={type.slug}
            initialFieldSchema={type.fieldSchema as FieldSchemaEntry[]}
            usageCount={usage?.n ?? 0}
          />
        </div>
      </main>
    </div>
  );
}
