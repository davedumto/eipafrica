"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldSchemaEntry } from "@/lib/listing-fields";
import { GenericField } from "./ListingWizard";
import DocumentsStep from "./DocumentsStep";
import ImagesStep from "./ImagesStep";

type ListingType = { id: string; slug: string; name: string; fieldSchema: FieldSchemaEntry[] };
type Country = { id: string; code: string; name: string };
type Sector = { id: string; slug: string; name: string };

const STAGES = [
  { value: "concept", label: "Concept" },
  { value: "feasibility", label: "Feasibility" },
  { value: "development", label: "Development" },
  { value: "financial_close", label: "Financial close" },
  { value: "construction", label: "Construction" },
  { value: "operational", label: "Operational" },
];

type FormState = {
  title: string;
  summary: string;
  description: string;
  sectorId: string;
  countryIds: string[];
  region: string;
  city: string;
  projectStage: string;
  deadlineAt: string;
  visibility: "public" | "members_only" | "private";
  isAnonymous: boolean;
  dealSizeAmount: string;
  dealSizeCurrency: string;
  extraFields: Record<string, unknown>;
};

export default function ListingEditForm({
  listingId,
  status,
  listingType,
  countries,
  sectors,
  initial,
}: {
  listingId: string;
  status: "draft" | "pending_review" | "live";
  listingType: ListingType;
  countries: Country[];
  sectors: Sector[];
  initial: FormState;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [savingAction, setSavingAction] = useState<"save" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const saving = savingAction !== null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function setExtra(key: string, value: unknown) {
    setForm((f) => ({ ...f, extraFields: { ...f.extraFields, [key]: value } }));
  }

  async function save(action: "save" | "submit") {
    if (
      action === "save" &&
      status === "live" &&
      !window.confirm(
        "This listing is live. Saving changes sends it back for admin review and takes it off the public site until it's re-approved. Continue?",
      )
    ) {
      return;
    }

    setError(null);
    setSavingAction(action);

    const payload: Record<string, unknown> = {
      title: form.title,
      summary: form.summary,
      description: form.description || null,
      sectorId: form.sectorId || null,
      countryIds: form.countryIds,
      region: form.region || null,
      city: form.city || null,
      projectStage: form.projectStage || null,
      deadlineAt: form.deadlineAt ? new Date(form.deadlineAt).toISOString() : null,
      visibility: form.visibility,
      isAnonymous: form.isAnonymous,
      dealSizeAmount: form.dealSizeAmount || null,
      dealSizeCurrency: form.dealSizeCurrency || null,
      dealSizeUsd: form.dealSizeCurrency === "USD" ? form.dealSizeAmount || null : null,
      extraFields: form.extraFields,
    };
    if (action === "submit") payload.submit = true;

    const res = await fetch(`/api/listings/${listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSavingAction(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save your changes.");
      return;
    }

    const data = await res.json().catch(() => ({}));

    // Explicit submit, or a save on a live listing that the server just sent
    // back into review (see app/api/listings/[id]/route.ts) — either way the
    // listing is now pending_review, so show the same confirmation.
    if (action === "submit" || (status === "live" && data.status === "pending_review")) {
      router.push(`/listings/${listingId}/edit?submitted=1`);
      return;
    }
    setLastSavedAt(new Date());
  }

  // --- Sector dropdown — fully self-contained, no shared component ---
  const [sectorOpen, setSectorOpen] = useState(false);
  const [sectorUp, setSectorUp] = useState(false);
  const sectorRootRef = useRef<HTMLDivElement>(null);
  const sectorOptions = [{ value: "", label: "Select a sector" }, ...sectors.map((s) => ({ value: s.id, label: s.name }))];
  const sectorSelected = sectorOptions.find((o) => o.value === form.sectorId);

  // --- Project stage dropdown ---
  const [stageOpen, setStageOpen] = useState(false);
  const [stageUp, setStageUp] = useState(false);
  const stageRootRef = useRef<HTMLDivElement>(null);
  const stageOptions = [{ value: "", label: "Not applicable" }, ...STAGES];
  const stageSelected = stageOptions.find((o) => o.value === form.projectStage);

  // --- Currency dropdown ---
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencyUp, setCurrencyUp] = useState(false);
  const currencyRootRef = useRef<HTMLDivElement>(null);
  const currencyOptions = ["USD", "NGN", "KES", "GHS", "ZAR"].map((c) => ({ value: c, label: c }));
  const currencySelected = currencyOptions.find((o) => o.value === form.dealSizeCurrency);

  // --- Visibility dropdown ---
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [visibilityUp, setVisibilityUp] = useState(false);
  const visibilityRootRef = useRef<HTMLDivElement>(null);
  const visibilityOptions = [
    { value: "public", label: "Public" },
    { value: "members_only", label: "Members only" },
    { value: "private", label: "Private (by invitation)" },
  ];
  const visibilitySelected = visibilityOptions.find((o) => o.value === form.visibility);

  function openDropdownUp(rootRef: React.RefObject<HTMLDivElement | null>): boolean {
    const el = rootRef.current;
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    return spaceBelow < 220 && rect.top > spaceBelow;
  }

  return (
    <div className="edit-form">
      <section className="edit-section">
        <h2>Basic info</h2>
        <div className="wiz-grid">
          <div className="gf-field span2">
            <label htmlFor="title">Title</label>
            <input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="20 MW Solar PV – Kaduna, Nigeria" />
          </div>
          <div className="gf-field span2">
            <label htmlFor="summary">Short summary</label>
            <textarea id="summary" rows={3} value={form.summary} onChange={(e) => set("summary", e.target.value)} placeholder="1–3 sentences shown on the listing card." />
          </div>
          <div className="gf-field span2">
            <label htmlFor="description">Full description (optional)</label>
            <textarea id="description" rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>

          <div className="gf-field">
            <label id="sector-label">Sector</label>
            <div className={`xselect${sectorOpen ? " open" : ""}`} ref={sectorRootRef}>
              <input type="hidden" name="sector" value={form.sectorId} />
              <button
                type="button"
                className="xselect-trigger"
                aria-haspopup="listbox"
                aria-expanded={sectorOpen}
                aria-labelledby="sector-label"
                onClick={() => {
                  if (sectorOpen) {
                    setSectorOpen(false);
                  } else {
                    setSectorUp(openDropdownUp(sectorRootRef));
                    setSectorOpen(true);
                  }
                }}
              >
                <span className="xselect-value">{sectorSelected?.label ?? "Select a sector"}</span>
                <span className="xselect-chevron" aria-hidden="true" />
              </button>
              {sectorOpen && (
                <>
                  <div className="xselect-backdrop" onClick={() => setSectorOpen(false)} />
                  <ul className={`xselect-list${sectorUp ? " xselect-list--up" : ""}`} role="listbox" aria-labelledby="sector-label">
                    {sectorOptions.map((opt) => (
                      <li
                        key={opt.value}
                        role="option"
                        aria-selected={opt.value === form.sectorId}
                        className={`xselect-opt${opt.value === form.sectorId ? " selected" : ""}`}
                        onClick={() => {
                          set("sectorId", opt.value);
                          setSectorOpen(false);
                        }}
                      >
                        {opt.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          <div className="gf-field">
            <label id="stage-label">Project stage</label>
            <div className={`xselect${stageOpen ? " open" : ""}`} ref={stageRootRef}>
              <input type="hidden" name="stage" value={form.projectStage} />
              <button
                type="button"
                className="xselect-trigger"
                aria-haspopup="listbox"
                aria-expanded={stageOpen}
                aria-labelledby="stage-label"
                onClick={() => {
                  if (stageOpen) {
                    setStageOpen(false);
                  } else {
                    setStageUp(openDropdownUp(stageRootRef));
                    setStageOpen(true);
                  }
                }}
              >
                <span className="xselect-value">{stageSelected?.label ?? "Not applicable"}</span>
                <span className="xselect-chevron" aria-hidden="true" />
              </button>
              {stageOpen && (
                <>
                  <div className="xselect-backdrop" onClick={() => setStageOpen(false)} />
                  <ul className={`xselect-list${stageUp ? " xselect-list--up" : ""}`} role="listbox" aria-labelledby="stage-label">
                    {stageOptions.map((opt) => (
                      <li
                        key={opt.value}
                        role="option"
                        aria-selected={opt.value === form.projectStage}
                        className={`xselect-opt${opt.value === form.projectStage ? " selected" : ""}`}
                        onClick={() => {
                          set("projectStage", opt.value);
                          setStageOpen(false);
                        }}
                      >
                        {opt.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="edit-section">
        <h2>Location</h2>
        <div className="wiz-grid">
          <div className="gf-field span2">
            <label>Country (select one or more)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {countries.map((c) => {
                const checked = form.countryIds.includes(c.id);
                return (
                  <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        set(
                          "countryIds",
                          checked ? form.countryIds.filter((id) => id !== c.id) : [...form.countryIds, c.id],
                        )
                      }
                    />
                    {c.name}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="gf-field">
            <label htmlFor="region">Region / state</label>
            <input id="region" value={form.region} onChange={(e) => set("region", e.target.value)} />
          </div>
          <div className="gf-field">
            <label htmlFor="city">City</label>
            <input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
        </div>
      </section>

      {(listingType.fieldSchema ?? []).length > 0 && (
        <section className="edit-section">
          <h2>Technical details</h2>
          <div className="wiz-grid">
            {listingType.fieldSchema.map((entry) => (
              <GenericField
                key={entry.key}
                entry={entry}
                value={form.extraFields[entry.key]}
                onChange={(v) => setExtra(entry.key, v)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="edit-section">
        <h2>Financials &amp; visibility</h2>
        <div className="wiz-grid">
          <div className="gf-field">
            <label htmlFor="dealAmount">Deal / contract size</label>
            <input
              id="dealAmount"
              type="number"
              value={form.dealSizeAmount}
              onChange={(e) => set("dealSizeAmount", e.target.value)}
            />
          </div>

          <div className="gf-field">
            <label id="currency-label">Currency</label>
            <div className={`xselect${currencyOpen ? " open" : ""}`} ref={currencyRootRef}>
              <input type="hidden" name="dealCurrency" value={form.dealSizeCurrency} />
              <button
                type="button"
                className="xselect-trigger"
                aria-haspopup="listbox"
                aria-expanded={currencyOpen}
                aria-labelledby="currency-label"
                onClick={() => {
                  if (currencyOpen) {
                    setCurrencyOpen(false);
                  } else {
                    setCurrencyUp(openDropdownUp(currencyRootRef));
                    setCurrencyOpen(true);
                  }
                }}
              >
                <span className="xselect-value">{currencySelected?.label ?? "USD"}</span>
                <span className="xselect-chevron" aria-hidden="true" />
              </button>
              {currencyOpen && (
                <>
                  <div className="xselect-backdrop" onClick={() => setCurrencyOpen(false)} />
                  <ul className={`xselect-list${currencyUp ? " xselect-list--up" : ""}`} role="listbox" aria-labelledby="currency-label">
                    {currencyOptions.map((opt) => (
                      <li
                        key={opt.value}
                        role="option"
                        aria-selected={opt.value === form.dealSizeCurrency}
                        className={`xselect-opt${opt.value === form.dealSizeCurrency ? " selected" : ""}`}
                        onClick={() => {
                          set("dealSizeCurrency", opt.value);
                          setCurrencyOpen(false);
                        }}
                      >
                        {opt.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          <div className="gf-field">
            <label htmlFor="deadline">Deadline / closing date (optional)</label>
            <input id="deadline" type="date" value={form.deadlineAt} onChange={(e) => set("deadlineAt", e.target.value)} />
          </div>

          <div className="gf-field">
            <label id="visibility-label">Visibility</label>
            <div className={`xselect${visibilityOpen ? " open" : ""}`} ref={visibilityRootRef}>
              <input type="hidden" name="visibility" value={form.visibility} />
              <button
                type="button"
                className="xselect-trigger"
                aria-haspopup="listbox"
                aria-expanded={visibilityOpen}
                aria-labelledby="visibility-label"
                onClick={() => {
                  if (visibilityOpen) {
                    setVisibilityOpen(false);
                  } else {
                    setVisibilityUp(openDropdownUp(visibilityRootRef));
                    setVisibilityOpen(true);
                  }
                }}
              >
                <span className="xselect-value">{visibilitySelected?.label ?? "Public"}</span>
                <span className="xselect-chevron" aria-hidden="true" />
              </button>
              {visibilityOpen && (
                <>
                  <div className="xselect-backdrop" onClick={() => setVisibilityOpen(false)} />
                  <ul className={`xselect-list${visibilityUp ? " xselect-list--up" : ""}`} role="listbox" aria-labelledby="visibility-label">
                    {visibilityOptions.map((opt) => (
                      <li
                        key={opt.value}
                        role="option"
                        aria-selected={opt.value === form.visibility}
                        className={`xselect-opt${opt.value === form.visibility ? " selected" : ""}`}
                        onClick={() => {
                          set("visibility", opt.value as FormState["visibility"]);
                          setVisibilityOpen(false);
                        }}
                      >
                        {opt.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          <div className="gf-field">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={form.isAnonymous} onChange={(e) => set("isAnonymous", e.target.checked)} />
              Hide our organization name until we accept an enquiry
            </label>
          </div>
        </div>
      </section>

      <section className="edit-section">
        <h2>Documents</h2>
        <DocumentsStep listingId={listingId} />
      </section>

      <section className="edit-section">
        <h2>Images</h2>
        <ImagesStep listingId={listingId} />
      </section>

      {error && (
        <p
          role="alert"
          style={{
            color: "#6a2a1c",
            background: "#f3e3bd",
            border: "1px solid rgba(122,79,0,0.25)",
            borderRadius: 12,
            padding: "12px 16px",
            marginTop: 20,
            fontSize: 14,
          }}
        >
          {error}
        </p>
      )}

      <div className="edit-savebar">
        <span className="edit-savebar-status">
          {savingAction === "save"
            ? "Saving…"
            : lastSavedAt
              ? `Saved at ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : ""}
        </span>
        <div className="edit-savebar-actions">
          <button
            className={status === "live" ? "btn-primary" : "btn-outline"}
            type="button"
            onClick={() => save("save")}
            disabled={saving}
          >
            {savingAction === "save" ? "Saving…" : status === "live" ? "Save & send for review" : "Save changes"}
          </button>
          {status === "draft" && (
            <button className="btn-primary" type="button" onClick={() => save("submit")} disabled={saving}>
              {savingAction === "submit" ? "Submitting…" : "Submit for review"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
