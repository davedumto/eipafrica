"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/app/components/Toaster";
import type { FieldSchemaEntry } from "@/lib/listing-fields";

const FIELD_TYPES: { value: FieldSchemaEntry["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select (one option)" },
  { value: "multiselect", label: "Multi-select" },
  { value: "repeater", label: "Repeater (list of rows)" },
];

type DraftField = FieldSchemaEntry & { _id: string };

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function newId() {
  return Math.random().toString(36).slice(2);
}

export default function ListingTypeForm({
  mode,
  id,
  initialName,
  initialSlug,
  initialFieldSchema,
  usageCount,
}: {
  mode: "create" | "edit";
  id?: string;
  initialName?: string;
  initialSlug?: string;
  initialFieldSchema?: FieldSchemaEntry[];
  usageCount?: number;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [slug, setSlug] = useState(initialSlug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [fields, setFields] = useState<DraftField[]>(
    (initialFieldSchema ?? []).map((f) => ({ ...f, _id: newId() })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addField() {
    setFields((f) => [...f, { _id: newId(), key: "", label: "", type: "text" }]);
  }

  function removeField(fieldId: string) {
    setFields((f) => f.filter((x) => x._id !== fieldId));
  }

  function moveField(fieldId: string, dir: -1 | 1) {
    setFields((f) => {
      const idx = f.findIndex((x) => x._id === fieldId);
      const swapWith = idx + dir;
      if (idx < 0 || swapWith < 0 || swapWith >= f.length) return f;
      const copy = [...f];
      [copy[idx], copy[swapWith]] = [copy[swapWith], copy[idx]];
      return copy;
    });
  }

  function updateField(fieldId: string, patch: Partial<DraftField>) {
    setFields((f) => f.map((x) => (x._id === fieldId ? { ...x, ...patch } : x)));
  }

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    for (const field of fields) {
      if (!field.key.trim() || !field.label.trim()) {
        setError("Every custom field needs a key and a label.");
        return;
      }
      if (field.type === "select" && (!field.options || field.options.filter(Boolean).length === 0)) {
        setError(`"${field.label || field.key}" is a select field but has no options.`);
        return;
      }
      if (field.type === "repeater" && (!field.fields || field.fields.filter(Boolean).length === 0)) {
        setError(`"${field.label || field.key}" is a repeater field but has no sub-fields.`);
        return;
      }
    }
    const keys = fields.map((f) => f.key.trim());
    if (new Set(keys).size !== keys.length) {
      setError("Field keys must be unique.");
      return;
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      fieldSchema: fields.map(({ _id, ...rest }) => rest),
    };

    const res = await fetch(mode === "create" ? "/api/admin/listing-types" : `/api/admin/listing-types/${id}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.error ?? "Could not save this listing type.";
      setError(message);
      showToast(message, "error");
      return;
    }

    showToast(mode === "create" ? `"${payload.name}" created.` : `"${payload.name}" updated.`, "success");
    router.push("/admin/config");
    router.refresh();
  }

  return (
    <div className="wiz" style={{ maxWidth: 760 }}>
      {typeof usageCount === "number" && usageCount > 0 && (
        <p
          style={{
            marginBottom: 20,
            padding: "12px 16px",
            background: "#f3e3bd",
            border: "1px solid rgba(122,79,0,0.25)",
            borderRadius: 12,
            fontSize: 14,
            color: "#5a3b00",
          }}
        >
          {usageCount} existing listing{usageCount === 1 ? "" : "s"} use this type. Removing a field here won&rsquo;t
          delete their data, but that data will no longer show on the listing detail page or wizard.
        </p>
      )}

      <div className="wiz-grid">
        <div className="gf-field">
          <label htmlFor="lt-name">Name</label>
          <input
            id="lt-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="e.g. Carbon credits"
          />
        </div>
        <div className="gf-field">
          <label htmlFor="lt-slug">Slug</label>
          <input
            id="lt-slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="carbon-credits"
          />
        </div>
      </div>

      <h3 style={{ marginTop: 32, fontSize: 18, fontFamily: "var(--serif)" }}>Custom fields</h3>
      <p style={{ marginTop: 6, fontSize: 13, color: "var(--on-bone-faint)" }}>
        These appear as the &ldquo;Technical details&rdquo; step in the listing wizard and on the listing detail page.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>
        {fields.map((field, i) => (
          <FieldRow
            key={field._id}
            field={field}
            index={i}
            total={fields.length}
            onChange={(patch) => updateField(field._id, patch)}
            onRemove={() => removeField(field._id)}
            onMove={(dir) => moveField(field._id, dir)}
          />
        ))}
        {fields.length === 0 && (
          <p style={{ fontSize: 14, color: "var(--on-bone-faint)" }}>No custom fields yet.</p>
        )}
      </div>

      <button type="button" className="btn-outline" style={{ marginTop: 16 }} onClick={addField}>
        + Add field
      </button>

      {error && (
        <p
          role="alert"
          style={{
            marginTop: 24,
            color: "#6a2a1c",
            background: "#f3e3bd",
            border: "1px solid rgba(122,79,0,0.25)",
            borderRadius: 12,
            padding: "12px 16px",
            fontSize: 14,
          }}
        >
          {error}
        </p>
      )}

      <div className="wiz-actions">
        <button type="button" className="btn-outline" onClick={() => router.push("/admin/config")} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={submit} disabled={saving}>
          {saving ? "Saving…" : mode === "create" ? "Create listing type" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function FieldRow({
  field,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  field: DraftField;
  index: number;
  total: number;
  onChange: (patch: Partial<DraftField>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeUp, setTypeUp] = useState(false);
  const typeRootRef = useRef<HTMLDivElement>(null);
  const typeSelected = FIELD_TYPES.find((t) => t.value === field.type);
  const labelId = `field-type-${field._id}`;

  return (
    <div
      style={{
        border: "1px solid rgba(16,17,20,0.1)",
        borderRadius: 16,
        padding: 18,
        background: "var(--card)",
      }}
    >
      <div className="wiz-grid">
        <div className="gf-field">
          <label htmlFor={`field-key-${field._id}`}>Key</label>
          <input
            id={`field-key-${field._id}`}
            value={field.key}
            onChange={(e) => onChange({ key: e.target.value })}
            placeholder="capacity"
          />
        </div>
        <div className="gf-field">
          <label htmlFor={`field-label-${field._id}`}>Label</label>
          <input
            id={`field-label-${field._id}`}
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Capacity (MW)"
          />
        </div>
        <div className="gf-field">
          <label id={labelId}>Type</label>
          <div className={`xselect${typeOpen ? " open" : ""}`} ref={typeRootRef}>
            <button
              type="button"
              className="xselect-trigger"
              aria-haspopup="listbox"
              aria-expanded={typeOpen}
              aria-labelledby={labelId}
              onClick={() => {
                if (typeOpen) {
                  setTypeOpen(false);
                } else {
                  const el = typeRootRef.current;
                  if (el) {
                    const rect = el.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - rect.bottom;
                    setTypeUp(spaceBelow < 260 && rect.top > spaceBelow);
                  }
                  setTypeOpen(true);
                }
              }}
            >
              <span className="xselect-value">{typeSelected?.label ?? "Text"}</span>
              <span className="xselect-chevron" aria-hidden="true" />
            </button>
            {typeOpen && (
              <>
                <div className="xselect-backdrop" onClick={() => setTypeOpen(false)} />
                <ul className={`xselect-list${typeUp ? " xselect-list--up" : ""}`} role="listbox" aria-labelledby={labelId}>
                  {FIELD_TYPES.map((opt) => (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={opt.value === field.type}
                      className={`xselect-opt${opt.value === field.type ? " selected" : ""}`}
                      onClick={() => {
                        onChange({ type: opt.value });
                        setTypeOpen(false);
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

      {field.type === "select" && (
        <div className="gf-field span2" style={{ marginTop: 14 }}>
          <label htmlFor={`field-options-${field._id}`}>Options (comma-separated)</label>
          <input
            id={`field-options-${field._id}`}
            value={(field.options ?? []).join(", ")}
            onChange={(e) => onChange({ options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
            placeholder="equity, debt, grant, mezzanine"
          />
        </div>
      )}

      {field.type === "repeater" && (
        <div className="gf-field span2" style={{ marginTop: 14 }}>
          <label htmlFor={`field-subfields-${field._id}`}>Sub-field names (comma-separated)</label>
          <input
            id={`field-subfields-${field._id}`}
            value={(field.fields ?? []).join(", ")}
            onChange={(e) => onChange({ fields: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
            placeholder="name, size, country, year"
          />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
        <button type="button" className="btn-outline" style={{ minHeight: 36, padding: "0 14px" }} disabled={index === 0} onClick={() => onMove(-1)}>
          ↑
        </button>
        <button
          type="button"
          className="btn-outline"
          style={{ minHeight: 36, padding: "0 14px" }}
          disabled={index === total - 1}
          onClick={() => onMove(1)}
        >
          ↓
        </button>
        <button type="button" className="btn-danger" style={{ minHeight: 36, padding: "0 14px" }} onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  );
}
