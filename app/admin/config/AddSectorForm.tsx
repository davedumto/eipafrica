"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/app/components/Toaster";

export default function AddSectorForm({ sectors }: { sectors: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [parentOpen, setParentOpen] = useState(false);
  const [parentUp, setParentUp] = useState(false);
  const parentRootRef = useRef<HTMLDivElement>(null);
  const parentOptions = [{ value: "", label: "None (top-level)" }, ...sectors.map((s) => ({ value: s.id, label: s.name }))];
  const parentSelected = parentOptions.find((o) => o.value === parentId);

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/sectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), parentId: parentId || null }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.error ?? "Could not add this sector.";
      setError(message);
      showToast(message, "error");
      return;
    }
    showToast(`${name.trim()} added.`, "success");
    setName("");
    setParentId("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="btn-outline" onClick={() => setOpen(true)}>
        + Add sector
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div className="gf-field" style={{ minWidth: 180 }}>
        <label htmlFor="new-sector-name">Name</label>
        <input id="new-sector-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Geothermal" />
      </div>
      <div className="gf-field" style={{ minWidth: 200 }}>
        <label id="new-sector-parent-label">Parent sector</label>
        <div className={`xselect${parentOpen ? " open" : ""}`} ref={parentRootRef}>
          <button
            type="button"
            className="xselect-trigger"
            aria-haspopup="listbox"
            aria-expanded={parentOpen}
            aria-labelledby="new-sector-parent-label"
            onClick={() => {
              if (parentOpen) {
                setParentOpen(false);
              } else {
                const el = parentRootRef.current;
                if (el) {
                  const rect = el.getBoundingClientRect();
                  const spaceBelow = window.innerHeight - rect.bottom;
                  setParentUp(spaceBelow < 220 && rect.top > spaceBelow);
                }
                setParentOpen(true);
              }
            }}
          >
            <span className="xselect-value">{parentSelected?.label ?? "None (top-level)"}</span>
            <span className="xselect-chevron" aria-hidden="true" />
          </button>
          {parentOpen && (
            <>
              <div className="xselect-backdrop" onClick={() => setParentOpen(false)} />
              <ul className={`xselect-list${parentUp ? " xselect-list--up" : ""}`} role="listbox" aria-labelledby="new-sector-parent-label">
                {parentOptions.map((opt) => (
                  <li
                    key={opt.value || "none"}
                    role="option"
                    aria-selected={opt.value === parentId}
                    className={`xselect-opt${opt.value === parentId ? " selected" : ""}`}
                    onClick={() => {
                      setParentId(opt.value);
                      setParentOpen(false);
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
      <button type="button" className="btn-primary" style={{ minHeight: 48 }} onClick={submit} disabled={saving}>
        {saving ? "Adding…" : "Add"}
      </button>
      <button type="button" className="btn-outline" style={{ minHeight: 48 }} onClick={() => setOpen(false)} disabled={saving}>
        Cancel
      </button>
      {error && <span style={{ fontSize: 12, color: "#6a2a1c", width: "100%" }}>{error}</span>}
    </div>
  );
}
