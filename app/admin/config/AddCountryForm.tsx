"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { showToast } from "@/app/components/Toaster";

export default function AddCountryForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name.trim() || !/^[A-Za-z]{2}$/.test(code.trim())) {
      setError("Name and a 2-letter code are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/countries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), code: code.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.error ?? "Could not add this country.";
      setError(message);
      showToast(message, "error");
      return;
    }
    showToast(`${name.trim()} added.`, "success");
    setName("");
    setCode("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="btn-outline" onClick={() => setOpen(true)}>
        + Add country
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div className="gf-field" style={{ minWidth: 180 }}>
        <label htmlFor="new-country-name">Name</label>
        <input id="new-country-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rwanda" />
      </div>
      <div className="gf-field" style={{ width: 100 }}>
        <label htmlFor="new-country-code">Code</label>
        <input
          id="new-country-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="RW"
          maxLength={2}
        />
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
