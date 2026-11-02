"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldSchemaEntry } from "@/lib/listing-fields";
import DocumentsStep from "./DocumentsStep";

type ListingType = { id: string; slug: string; name: string; fieldSchema: FieldSchemaEntry[] };
type Country = { id: string; code: string; name: string };
type Sector = { id: string; slug: string; name: string };

const STEPS = ["Type", "Basic info", "Location", "Technical details", "Financials", "Documents", "Review"] as const;

const STAGES = [
  { value: "concept", label: "Concept" },
  { value: "feasibility", label: "Feasibility" },
  { value: "development", label: "Development" },
  { value: "financial_close", label: "Financial close" },
  { value: "construction", label: "Construction" },
  { value: "operational", label: "Operational" },
];

type FormState = {
  listingTypeId: string;
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

const EMPTY: FormState = {
  listingTypeId: "",
  title: "",
  summary: "",
  description: "",
  sectorId: "",
  countryIds: [],
  region: "",
  city: "",
  projectStage: "",
  deadlineAt: "",
  visibility: "public",
  isAnonymous: false,
  dealSizeAmount: "",
  dealSizeCurrency: "USD",
  extraFields: {},
};

export default function ListingWizard({
  listingTypes,
  countries,
  sectors,
  listingId: initialListingId,
  initial,
}: {
  listingTypes: ListingType[];
  countries: Country[];
  sectors: Sector[];
  listingId?: string;
  initial?: Partial<FormState>;
}) {
  const router = useRouter();
  // Always starts at 0 on both server and client render so the first paint
  // matches (no hydration mismatch) — the ?step= URL param, if any, is read
  // and applied right after mount instead, client-side only, via the effect
  // below.
  const [step, setStep] = useState(0);
  const [listingId, setListingId] = useState<string | undefined>(initialListingId);
  const [form, setForm] = useState<FormState>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount, jump to the step recorded in the URL (resuming a reload).
  useEffect(() => {
    const fromUrl = Number(new URLSearchParams(window.location.search).get("step"));
    if (Number.isInteger(fromUrl) && fromUrl > 0 && fromUrl < STEPS.length) {
      setStep(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL's ?step= in sync so a reload resumes on the step the user
  // was on, not step 0. No navigation/remount — just the address bar.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("step") === String(step)) return;
    url.searchParams.set("step", String(step));
    window.history.replaceState(null, "", url.toString());
  }, [step]);

  const selectedType = listingTypes.find((t) => t.id === form.listingTypeId);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setExtra(key: string, value: unknown) {
    setForm((f) => ({ ...f, extraFields: { ...f.extraFields, [key]: value } }));
  }

  async function ensureListing(): Promise<string | undefined> {
    if (listingId) return listingId;
    if (!form.listingTypeId) return undefined;
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingTypeId: form.listingTypeId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not start the listing.");
      return undefined;
    }
    const data = await res.json();
    setListingId(data.id);
    // Swap the URL to the resumable edit route without a navigation/remount
    // (which would lose the in-progress form state held in this component) —
    // this is what makes a reload recover the draft instead of starting blank.
    if (typeof window !== "undefined" && window.location.pathname === "/listings/new") {
      window.history.replaceState(null, "", `/listings/${data.id}/edit`);
    }
    return data.id;
  }

  async function saveDraft(opts: { submit?: boolean } = {}) {
    setError(null);
    setSaving(true);
    const id = await ensureListing();
    if (!id) {
      setSaving(false);
      return false;
    }

    const payload = {
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
      ...opts,
    };

    const res = await fetch(`/api/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save your changes.");
      return false;
    }
    return true;
  }

  async function next() {
    if (step === 0 && !form.listingTypeId) {
      setError("Pick a listing type to continue.");
      return;
    }
    const ok = await saveDraft();
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    const ok = await saveDraft({ submit: true });
    if (ok && listingId) {
      router.push(`/listings/${listingId}/edit?submitted=1`);
    }
  }

  // --- Sector dropdown (step 1) — fully self-contained, no shared component ---
  const [sectorOpen, setSectorOpen] = useState(false);
  const [sectorUp, setSectorUp] = useState(false);
  const sectorRootRef = useRef<HTMLDivElement>(null);
  const sectorOptions = [{ value: "", label: "Select a sector" }, ...sectors.map((s) => ({ value: s.id, label: s.name }))];
  const sectorSelected = sectorOptions.find((o) => o.value === form.sectorId);

  // --- Project stage dropdown (step 1) ---
  const [stageOpen, setStageOpen] = useState(false);
  const [stageUp, setStageUp] = useState(false);
  const stageRootRef = useRef<HTMLDivElement>(null);
  const stageOptions = [{ value: "", label: "Not applicable" }, ...STAGES];
  const stageSelected = stageOptions.find((o) => o.value === form.projectStage);

  // --- Currency dropdown (step 4) ---
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencyUp, setCurrencyUp] = useState(false);
  const currencyRootRef = useRef<HTMLDivElement>(null);
  const currencyOptions = ["USD", "NGN", "KES", "GHS", "ZAR"].map((c) => ({ value: c, label: c }));
  const currencySelected = currencyOptions.find((o) => o.value === form.dealSizeCurrency);

  // --- Visibility dropdown (step 4) ---
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
    <div className="wiz">
      <div className="wiz-steps">
        {STEPS.map((label, i) => (
          <span key={label} className={`wiz-step${i === step ? " on" : i < step ? " done" : ""}`}>
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {step === 0 && (
        <div className="wiz-type-grid">
          {listingTypes.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`wiz-type-card${form.listingTypeId === t.id ? " on" : ""}`}
              onClick={() => set("listingTypeId", t.id)}
              disabled={Boolean(listingId)}
            >
              <span className="t">{t.name}</span>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
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
      )}

      {step === 2 && (
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
      )}

      {step === 3 && (
        <div className="wiz-grid">
          {(selectedType?.fieldSchema ?? []).length === 0 && (
            <p style={{ color: "var(--on-bone-faint)" }}>This listing type has no additional technical fields.</p>
          )}
          {(selectedType?.fieldSchema ?? []).map((entry) => (
            <GenericField
              key={entry.key}
              entry={entry}
              value={form.extraFields[entry.key]}
              onChange={(v) => setExtra(entry.key, v)}
            />
          ))}
        </div>
      )}

      {step === 4 && (
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
      )}

      {step === 5 && <DocumentsStep listingId={listingId} />}

      {step === 6 && (
        <div className="wiz-grid">
          <div className="span2">
            <h3 style={{ fontSize: 22, fontFamily: "var(--serif)" }}>{form.title || "Untitled listing"}</h3>
            <p style={{ marginTop: 8, color: "var(--on-bone-muted)" }}>{form.summary}</p>
            <p style={{ marginTop: 16, fontSize: 13, color: "var(--on-bone-faint)" }}>
              Submitting sends this listing for admin review. It will go live once approved.
            </p>
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          style={{
            color: "#6a2a1c",
            background: "#f3e3bd",
            border: "1px solid rgba(122,79,0,0.25)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          {error}
        </p>
      )}

      <div className="wiz-actions">
        <button className="btn-outline" type="button" onClick={back} disabled={step === 0 || saving}>
          Back
        </button>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-outline" type="button" onClick={() => saveDraft()} disabled={saving}>
            {saving ? "Saving…" : "Save as draft"}
          </button>
          {step < STEPS.length - 1 ? (
            <button className="btn-primary" type="button" onClick={next} disabled={saving}>
              {saving ? "Saving…" : "Continue"}
            </button>
          ) : (
            <button className="btn-primary" type="button" onClick={submit} disabled={saving}>
              {saving ? "Submitting…" : "Submit for review"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GenericField({
  entry,
  value,
  onChange,
}: {
  entry: FieldSchemaEntry;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  // Each GenericField instance that renders a dropdown owns its own open/up
  // state — this component is already instantiated per field by the caller
  // (one GenericField per field_schema entry), so this remains fully
  // self-contained per rendered field, nothing shared across fields.
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  if (entry.type === "textarea") {
    return (
      <div className="gf-field span2">
        <label htmlFor={entry.key}>{entry.label}</label>
        <textarea id={entry.key} rows={4} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }
  if (entry.type === "select" && entry.options) {
    const options = [{ value: "", label: "Select…" }, ...entry.options.map((opt) => ({ value: opt, label: opt }))];
    const current = (value as string) ?? "";
    const selected = options.find((o) => o.value === current);
    const labelId = `${entry.key}-label`;
    return (
      <div className="gf-field">
        <label id={labelId}>{entry.label}</label>
        <div className={`xselect${open ? " open" : ""}`} ref={rootRef}>
          <input type="hidden" name={entry.key} value={current} />
          <button
            type="button"
            className="xselect-trigger"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-labelledby={labelId}
            onClick={() => {
              if (open) {
                setOpen(false);
              } else {
                const el = rootRef.current;
                if (el) {
                  const rect = el.getBoundingClientRect();
                  const spaceBelow = window.innerHeight - rect.bottom;
                  setUp(spaceBelow < 220 && rect.top > spaceBelow);
                }
                setOpen(true);
              }
            }}
          >
            <span className="xselect-value">{selected?.label ?? "Select…"}</span>
            <span className="xselect-chevron" aria-hidden="true" />
          </button>
          {open && (
            <>
              <div className="xselect-backdrop" onClick={() => setOpen(false)} />
              <ul className={`xselect-list${up ? " xselect-list--up" : ""}`} role="listbox" aria-labelledby={labelId}>
                {options.map((opt) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={opt.value === current}
                    className={`xselect-opt${opt.value === current ? " selected" : ""}`}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
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
    );
  }
  if (entry.type === "multiselect") {
    const values = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="gf-field span2">
        <label htmlFor={entry.key}>{entry.label} (comma-separated)</label>
        <input
          id={entry.key}
          value={values.join(", ")}
          onChange={(e) => onChange(e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
        />
      </div>
    );
  }
  if (entry.type === "repeater") {
    // Simplified single free-text capture for repeater fields (e.g. past projects) for now —
    // a dedicated repeatable-row UI is a reasonable follow-up once this is in use.
    return (
      <div className="gf-field span2">
        <label htmlFor={entry.key}>
          {entry.label} ({(entry.fields ?? []).join(", ")} — one per line)
        </label>
        <textarea
          id={entry.key}
          rows={3}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
  return (
    <div className="gf-field">
      <label htmlFor={entry.key}>{entry.label}</label>
      <input
        id={entry.key}
        type={entry.type === "number" || entry.type === "currency" ? "number" : entry.type === "date" ? "date" : "text"}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
