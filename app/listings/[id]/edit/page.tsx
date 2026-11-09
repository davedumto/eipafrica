import { notFound, redirect } from "next/navigation";
import { and, asc, eq, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { countries, listingTypes, listings, organizationMembers, sectors } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import ListingWizard from "@/app/listings/ListingWizard";
import type { FieldSchemaEntry } from "@/lib/listing-fields";

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { id } = await params;
  const { submitted } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?next=/listings/${id}/edit`);
  }

  const [listing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!listing) notFound();

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
  if (!membership) notFound();

  // A draft is private to whoever created it until it's submitted for
  // review — other org members can't open or edit someone else's draft.
  if (listing.status === "draft" && listing.createdByUserId !== session.user.id) {
    notFound();
  }

  // Active rows, plus whatever this listing already has selected (even if
  // since deactivated) — otherwise editing a listing whose type/sector was
  // deactivated after the fact would silently drop its current selection.
  const [types, allCountries, allSectors] = await Promise.all([
    db
      .select()
      .from(listingTypes)
      .where(or(eq(listingTypes.isActive, true), eq(listingTypes.id, listing.listingTypeId)))
      .orderBy(asc(listingTypes.sortOrder)),
    db.select().from(countries).where(eq(countries.isActive, true)).orderBy(asc(countries.name)),
    db
      .select()
      .from(sectors)
      .where(listing.sectorId ? or(eq(sectors.isActive, true), eq(sectors.id, listing.sectorId)) : eq(sectors.isActive, true))
      .orderBy(asc(sectors.name)),
  ]);

  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in">
          <p className="eyebrow">{listing.status === "pending_review" ? "PENDING REVIEW" : "DRAFT"}</p>
          <h1 style={{ marginTop: 14, marginBottom: 12, fontSize: "clamp(32px,4vw,44px)" }}>
            Edit listing
          </h1>
          {submitted && (
            <p style={{ marginBottom: 24, color: "var(--amber-on-bone)" }}>
              Submitted for review. We&rsquo;ll email you once it&rsquo;s approved.
            </p>
          )}
          <ListingWizard
            listingTypes={types.map((t) => ({
              id: t.id,
              slug: t.slug,
              name: t.name,
              fieldSchema: t.fieldSchema as FieldSchemaEntry[],
            }))}
            countries={allCountries}
            sectors={allSectors}
            listingId={listing.id}
            initial={{
              listingTypeId: listing.listingTypeId,
              title: listing.title === "Untitled listing" ? "" : listing.title,
              summary: listing.summary,
              description: listing.description ?? "",
              sectorId: listing.sectorId ?? "",
              countryIds: (listing.countryIds as string[]) ?? [],
              region: listing.region ?? "",
              city: listing.city ?? "",
              projectStage: listing.projectStage ?? "",
              deadlineAt: listing.deadlineAt ? new Date(listing.deadlineAt).toISOString().slice(0, 10) : "",
              visibility: listing.visibility,
              isAnonymous: listing.isAnonymous,
              dealSizeAmount: listing.dealSizeAmount ?? "",
              dealSizeCurrency: listing.dealSizeCurrency ?? "USD",
              extraFields: (listing.extraFields as Record<string, unknown>) ?? {},
            }}
          />
        </div>
      </main>
    </div>
  );
}
