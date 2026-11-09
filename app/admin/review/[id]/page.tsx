import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listingTypes, listings, organizations, sectors } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import ReviewActions from "./ReviewActions";
import { badgeClassForSlug, formatFieldValue, type FieldSchemaEntry } from "@/lib/listing-fields";

export default async function AdminReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?next=/admin/review/${id}`);
  if (!session.user.isAdmin) redirect("/opportunities");

  const [listing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!listing) notFound();

  const [[type], [org], [sector]] = await Promise.all([
    db.select().from(listingTypes).where(eq(listingTypes.id, listing.listingTypeId)).limit(1),
    db.select().from(organizations).where(eq(organizations.id, listing.organizationId)).limit(1),
    listing.sectorId
      ? db.select().from(sectors).where(eq(sectors.id, listing.sectorId)).limit(1)
      : Promise.resolve([null]),
  ]);

  const fieldSchema = (type?.fieldSchema ?? []) as FieldSchemaEntry[];
  const extraFields = (listing.extraFields ?? {}) as Record<string, unknown>;

  const dealLabel =
    listing.dealSizeAmount && listing.dealSizeCurrency
      ? `${listing.dealSizeCurrency} ${Number(listing.dealSizeAmount).toLocaleString()}`
      : listing.dealSizeUsd
        ? `$${Number(listing.dealSizeUsd).toLocaleString()}`
        : null;

  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in">
          <p className="eyebrow">ADMIN · REVIEW</p>
          <div className="detail-head">
            {type && <span className={`badge ${badgeClassForSlug(type.slug)}`}>{type.name}</span>}
            <h1>{listing.title}</h1>
            <div className="detail-meta">
              <span>{org?.name ?? "Unknown organization"}</span>
              {sector && <span>{sector.name}</span>}
              <span>Submitted {new Date(listing.createdAt).toLocaleDateString()}</span>
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
                  <div>
                    <dt>Visibility</dt>
                    <dd>{listing.visibility.replace("_", " ")}</dd>
                  </div>
                </dl>
              </section>

              {fieldSchema.length > 0 && (
                <section className="detail-section">
                  <h2>{type?.name} details</h2>
                  <dl className="fieldlist">
                    {fieldSchema.map((entry) => (
                      <div key={entry.key}>
                        <dt>{entry.label}</dt>
                        <dd>{formatFieldValue(entry, extraFields[entry.key])}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {listing.reviewComments && (
                <section className="detail-section">
                  <h2>Previous review comments</h2>
                  <p style={{ marginTop: 12, fontSize: 14, color: "var(--on-bone-muted)" }}>
                    {listing.reviewComments}
                  </p>
                </section>
              )}
            </div>

            <aside className="detail-side">
              <span className="org">{org?.name}</span>
              {org?.isVerified && <span className="verified">✓ Verified organization</span>}
              <ReviewActions listingId={listing.id} />
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
