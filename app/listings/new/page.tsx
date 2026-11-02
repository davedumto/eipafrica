import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { countries, listingTypes, sectors } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import ListingWizard from "@/app/listings/ListingWizard";
import type { FieldSchemaEntry } from "@/lib/listing-fields";

export const instant = false;

export default async function NewListingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/listings/new");
  }

  const [types, allCountries, allSectors] = await Promise.all([
    db.select().from(listingTypes).where(eq(listingTypes.isActive, true)).orderBy(asc(listingTypes.sortOrder)),
    db.select().from(countries).where(eq(countries.isActive, true)).orderBy(asc(countries.name)),
    db.select().from(sectors).where(eq(sectors.isActive, true)).orderBy(asc(sectors.name)),
  ]);

  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in">
          <p className="eyebrow">POST AN OPPORTUNITY</p>
          <h1 style={{ marginTop: 14, marginBottom: 36, fontSize: "clamp(32px,4vw,44px)" }}>
            Create a listing
          </h1>
          <ListingWizard
            listingTypes={types.map((t) => ({
              id: t.id,
              slug: t.slug,
              name: t.name,
              fieldSchema: t.fieldSchema as FieldSchemaEntry[],
            }))}
            countries={allCountries}
            sectors={allSectors}
          />
        </div>
      </main>
    </div>
  );
}
