import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { countries, listingTypes, sectors } from "@/lib/db/schema";
import AppBar from "@/app/components/AppBar";
import { badgeClassForSlug } from "@/lib/listing-fields";
import ListingTypeRow from "./ListingTypeRow";
import CountryRow from "./CountryRow";
import AddCountryForm from "./AddCountryForm";
import SectorRow from "./SectorRow";
import AddSectorForm from "./AddSectorForm";

export default async function AdminConfigPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/admin/config");
  if (!session.user.isAdmin) redirect("/opportunities");

  const [types, allCountries, allSectors] = await Promise.all([
    db.select().from(listingTypes).orderBy(asc(listingTypes.sortOrder)),
    db.select().from(countries).orderBy(asc(countries.name)),
    db.select().from(sectors).orderBy(asc(sectors.name)),
  ]);

  const sectorById = new Map(allSectors.map((s) => [s.id, s]));

  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in">
          <p className="eyebrow">ADMIN</p>
          <h1 style={{ marginTop: 14, fontSize: "clamp(32px,4vw,44px)" }}>Listing types &amp; reference data</h1>
          <p style={{ marginTop: 12, color: "var(--on-bone-muted)", maxWidth: "60ch" }}>
            Add, edit, deactivate or remove the listing types, countries and sectors used across the platform.
          </p>

          <nav className="admin-tabs" aria-label="Admin sections">
            <Link href="/admin">Review queue</Link>
            <Link href="/admin/organizations">Organizations</Link>
            <Link href="/admin/listings">Listings</Link>
            <Link href="/admin/users">Users</Link>
            <Link href="/admin/config" className="on">
              Listing types &amp; reference data
            </Link>
            <Link href="/admin/reports">Reports</Link>
          </nav>

          <section className="detail-section" style={{ marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <h2>Listing types</h2>
              <Link className="btn-outline" href="/admin/config/listing-types/new">
                + Add listing type
              </Link>
            </div>
            <div className="dash-list" style={{ marginTop: 16 }}>
              {types.map((t) => (
                <ListingTypeRow
                  key={t.id}
                  id={t.id}
                  name={t.name}
                  slug={t.slug}
                  isActive={t.isActive}
                  fieldCount={Array.isArray(t.fieldSchema) ? t.fieldSchema.length : 0}
                  badgeClass={badgeClassForSlug(t.slug)}
                />
              ))}
              {types.length === 0 && <div className="empty">No listing types configured.</div>}
            </div>
          </section>

          <section className="detail-section">
            <h2>Countries</h2>
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <AddCountryForm />
            </div>
            <div className="dash-list">
              {allCountries.map((c) => (
                <CountryRow key={c.id} id={c.id} name={c.name} code={c.code} isActive={c.isActive} />
              ))}
              {allCountries.length === 0 && <div className="empty">No countries configured.</div>}
            </div>
          </section>

          <section className="detail-section">
            <h2>Sectors</h2>
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <AddSectorForm sectors={allSectors.map((s) => ({ id: s.id, name: s.name }))} />
            </div>
            <div className="dash-list">
              {allSectors.map((s) => (
                <SectorRow
                  key={s.id}
                  id={s.id}
                  name={s.name}
                  slug={s.slug}
                  isActive={s.isActive}
                  parentName={s.parentId ? sectorById.get(s.parentId)?.name ?? null : null}
                />
              ))}
              {allSectors.length === 0 && <div className="empty">No sectors configured.</div>}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
