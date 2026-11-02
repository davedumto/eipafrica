import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  countries,
  enquiries,
  listingDocuments,
  listingTypes,
  listings,
  organizations,
  savedListings,
  sectors,
} from "@/lib/db/schema";
import Link from "next/link";
import AppBar from "@/app/components/AppBar";
import EnquiryActions from "./EnquiryActions";
import {
  badgeClassForSlug,
  formatFieldValue,
  type FieldSchemaEntry,
} from "@/lib/listing-fields";

export const instant = false;

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  const isLoggedIn = Boolean(userId);

  const [listing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);

  if (!listing) notFound();
  if (listing.status !== "live") {
    // Owners/admins could be allowed to preview non-live listings in a later pass; for now, treat as not found.
    notFound();
  }
  if (listing.visibility === "private") notFound();
  if (listing.visibility === "members_only" && !isLoggedIn) notFound();
  // Browsing listing cards needs no account; full listing details do (see Hero's
  // copy on the homepage) — so a public listing's detail page still requires login,
  // same as every other gated page in the app, redirecting back here afterward.
  if (!isLoggedIn) redirect(`/login?next=/opportunities/${id}`);

  const [[type], [org], allCountries, [sector], docs, [saved]] = await Promise.all([
    db.select().from(listingTypes).where(eq(listingTypes.id, listing.listingTypeId)).limit(1),
    db.select().from(organizations).where(eq(organizations.id, listing.organizationId)).limit(1),
    db.select().from(countries),
    listing.sectorId
      ? db.select().from(sectors).where(eq(sectors.id, listing.sectorId)).limit(1)
      : Promise.resolve([null]),
    db.select().from(listingDocuments).where(eq(listingDocuments.listingId, listing.id)),
    userId
      ? db
          .select({ id: savedListings.id })
          .from(savedListings)
          .where(and(eq(savedListings.userId, userId), eq(savedListings.listingId, listing.id)))
          .limit(1)
      : Promise.resolve([null]),
  ]);

  // An accepted enquiry from this viewer reveals the owner org name even if the listing is anonymous.
  let revealOwner = !listing.isAnonymous;
  if (listing.isAnonymous && userId) {
    const [accepted] = await db
      .select({ id: enquiries.id })
      .from(enquiries)
      .where(
        and(
          eq(enquiries.listingId, listing.id),
          eq(enquiries.fromUserId, userId),
          eq(enquiries.status, "accepted"),
        ),
      )
      .limit(1);
    revealOwner = Boolean(accepted);
  }

  // An accepted document-request enquiry from this viewer unlocks confidential document downloads.
  let hasDocumentAccess = false;
  if (userId) {
    const [acceptedRequest] = await db
      .select({ id: enquiries.id })
      .from(enquiries)
      .where(
        and(
          eq(enquiries.listingId, listing.id),
          eq(enquiries.fromUserId, userId),
          eq(enquiries.type, "document_request"),
          eq(enquiries.status, "accepted"),
        ),
      )
      .limit(1);
    hasDocumentAccess = Boolean(acceptedRequest);
  }

  const countryById = new Map(allCountries.map((c) => [c.id, c]));
  const countryNames = Array.isArray(listing.countryIds)
    ? (listing.countryIds as string[])
        .map((cid) => countryById.get(cid)?.name)
        .filter(Boolean)
        .join(", ")
    : "";

  const fieldSchema = (type?.fieldSchema ?? []) as FieldSchemaEntry[];
  const extraFields = (listing.extraFields ?? {}) as Record<string, unknown>;

  const dealLabel =
    listing.dealSizeAmount && listing.dealSizeCurrency
      ? `${listing.dealSizeCurrency} ${Number(listing.dealSizeAmount).toLocaleString()}`
      : listing.dealSizeUsd
        ? `$${Number(listing.dealSizeUsd).toLocaleString()}`
        : null;

  const publicDocs = docs.filter((d) => d.tag === "public");
  const confidentialDocs = docs.filter((d) => d.tag === "confidential");

  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in">
          <div className="detail-head">
            {type && <span className={`badge ${badgeClassForSlug(type.slug)}`}>{type.name}</span>}
            {listing.projectStage && <span className="eyebrow">{listing.projectStage.replace("_", " ").toUpperCase()}</span>}
            <h1>{listing.title}</h1>
            <div className="detail-meta">
              <span>{countryNames || listing.region || "—"}</span>
              {sector && <span>{sector.name}</span>}
              {listing.deadlineAt && <span>Closes {new Date(listing.deadlineAt).toLocaleDateString()}</span>}
            </div>
          </div>

          <div className="detail-grid">
            <div>
              <section className="detail-section">
                <h2>Summary</h2>
                <p style={{ marginTop: 12, fontSize: 16, lineHeight: 1.6, color: "var(--on-bone-muted)" }}>
                  {listing.summary}
                </p>
                {listing.description && (
                  <p style={{ marginTop: 16, fontSize: 15, lineHeight: 1.6, color: "var(--on-bone-muted)" }}>
                    {listing.description}
                  </p>
                )}
              </section>

              <section className="detail-section">
                <h2>Key details</h2>
                <dl className="fieldlist">
                  {dealLabel && (
                    <div>
                      <dt>Deal / contract size</dt>
                      <dd>{dealLabel}</dd>
                    </div>
                  )}
                  {listing.projectStage && (
                    <div>
                      <dt>Project stage</dt>
                      <dd>{listing.projectStage.replace("_", " ")}</dd>
                    </div>
                  )}
                  {listing.city && (
                    <div>
                      <dt>City</dt>
                      <dd>{listing.city}</dd>
                    </div>
                  )}
                  {countryNames && (
                    <div>
                      <dt>Country</dt>
                      <dd>{countryNames}</dd>
                    </div>
                  )}
                </dl>
              </section>

              {fieldSchema.length > 0 && (
                <section className="detail-section">
                  <h2>{type?.name} details</h2>
                  <dl className="fieldlist">
                    {fieldSchema.map((entry) => (
                      <div key={entry.key}>
                        <dt>{entry.label}</dt>
                        <dd style={entry.type === "repeater" ? { whiteSpace: "pre-line" } : undefined}>
                          {formatFieldValue(entry, extraFields[entry.key])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {docs.length > 0 && (
                <section className="detail-section">
                  <h2>Documents</h2>
                  <div className="doclist">
                    {publicDocs.map((d) => (
                      <div className="docrow" key={d.id}>
                        <span className="name">
                          {d.filename}
                          <span className="doctag">Public</span>
                        </span>
                        <a className="btn-outline" href={`/api/listings/${listing.id}/documents/${d.id}/download`}>
                          Download
                        </a>
                      </div>
                    ))}
                    {confidentialDocs.map((d) => (
                      <div className="docrow" key={d.id}>
                        <span className="name">
                          {d.filename}
                          <span className="doctag confidential">Confidential</span>
                        </span>
                        {hasDocumentAccess ? (
                          <a className="btn-outline" href={`/api/listings/${listing.id}/documents/${d.id}/download`}>
                            Download
                          </a>
                        ) : (
                          <span style={{ color: "var(--on-bone-faint)", fontSize: 13 }}>
                            Request access to view
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="detail-side">
              {revealOwner && org ? (
                <Link className="org" href={`/organizations/${org.id}`}>
                  {org.name}
                </Link>
              ) : (
                <span className="org">Anonymous developer</span>
              )}
              {org?.isVerified && <span className="verified">✓ Verified organization</span>}
              <EnquiryActions
                listingId={listing.id}
                isLoggedIn={isLoggedIn}
                isTender={type?.slug === "tender-procurement-request"}
                initiallySaved={Boolean(saved)}
              />
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
