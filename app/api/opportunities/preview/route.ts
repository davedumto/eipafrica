import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { countries, listingTypes, listings, organizations, sectors } from "@/lib/db/schema";

const PREVIEW_LIMIT = 12;

export async function GET() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user?.id);

  const visibilityClause = isLoggedIn
    ? inArray(listings.visibility, ["public", "members_only"])
    : eq(listings.visibility, "public");

  const [rows, allTypes, allSectors, allCountries] = await Promise.all([
    db
      .select({
        id: listings.id,
        title: listings.title,
        dealSizeUsd: listings.dealSizeUsd,
        dealSizeAmount: listings.dealSizeAmount,
        dealSizeCurrency: listings.dealSizeCurrency,
        projectStage: listings.projectStage,
        region: listings.region,
        countryIds: listings.countryIds,
        isAnonymous: listings.isAnonymous,
        listingTypeId: listings.listingTypeId,
        sectorId: listings.sectorId,
        orgName: organizations.name,
        orgIsVerified: organizations.isVerified,
        isFeatured: listings.isFeatured,
        createdAt: listings.createdAt,
      })
      .from(listings)
      .innerJoin(organizations, eq(listings.organizationId, organizations.id))
      .where(and(eq(listings.status, "live"), visibilityClause))
      .orderBy(desc(listings.isFeatured), desc(listings.createdAt))
      .limit(PREVIEW_LIMIT),
    db.select({ id: listingTypes.id, slug: listingTypes.slug, name: listingTypes.name }).from(listingTypes),
    db.select({ id: sectors.id, slug: sectors.slug, name: sectors.name }).from(sectors),
    db.select({ id: countries.id, name: countries.name }).from(countries),
  ]);

  const typeById = new Map(allTypes.map((t) => [t.id, t]));
  const sectorById = new Map(allSectors.map((s) => [s.id, s]));
  const countryById = new Map(allCountries.map((c) => [c.id, c.name]));

  const items = rows.map((r) => {
    const type = typeById.get(r.listingTypeId);
    const sector = r.sectorId ? sectorById.get(r.sectorId) : undefined;
    const countryNames = Array.isArray(r.countryIds)
      ? (r.countryIds as string[]).map((id) => countryById.get(id)).filter(Boolean).join(", ")
      : "";
    const deal =
      r.dealSizeAmount && r.dealSizeCurrency
        ? `${r.dealSizeCurrency} ${Number(r.dealSizeAmount).toLocaleString()}`
        : r.dealSizeUsd
          ? `$${Number(r.dealSizeUsd).toLocaleString()}`
          : null;

    return {
      id: r.id,
      title: r.title,
      typeSlug: type?.slug ?? "",
      typeName: type?.name ?? "",
      sectorSlug: sector?.slug ?? "",
      sectorName: sector?.name ?? "",
      country: countryNames || r.region || "—",
      dealLabel: deal,
      dealSizeUsd: r.dealSizeUsd ? Number(r.dealSizeUsd) : null,
      stage: r.projectStage ? r.projectStage.replace("_", " ") : "—",
      orgName: r.isAnonymous ? "Anonymous developer" : r.orgName,
      isVerified: r.orgIsVerified,
      isFeatured: r.isFeatured,
    };
  });

  return NextResponse.json({
    items,
    types: allTypes.map((t) => ({ slug: t.slug, name: t.name })),
    sectors: allSectors.map((s) => ({ slug: s.slug, name: s.name })),
  });
}
