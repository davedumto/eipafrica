"use client";

import { useState } from "react";
import Link from "next/link";
import { showToast } from "@/app/components/Toaster";

export default function OrganizationForm({
  orgId,
  name: initialName,
  description: initialDescription,
  website: initialWebsite,
  isAdmin,
}: {
  orgId: string;
  name: string;
  description: string;
  website: string;
  isAdmin: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [website, setWebsite] = useState(initialWebsite);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch(`/api/organizations/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, website }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      const message = data.error ?? "Could not update your organization.";
      setError(message);
      showToast(message, "error");
      return;
    }

    showToast("Organization updated.", "success");
  }

  return (
    <div style={{ marginTop: 32, maxWidth: 480 }}>
      <form className="wiz-grid" onSubmit={handleSubmit}>
        <div className="gf-field span2">
          <label htmlFor="org-name">Organization name</label>
          <input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin}
            required
          />
        </div>
        <div className="gf-field span2">
          <label htmlFor="org-description">Description</label>
          <textarea
            id="org-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isAdmin}
            placeholder="A short summary of what your organization does — shown on your public profile."
          />
        </div>
        <div className="gf-field span2">
          <label htmlFor="org-website">Website</label>
          <input
            id="org-website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            disabled={!isAdmin}
            placeholder="https://example.com"
          />
        </div>
        {error && (
          <p role="alert" className="span2" style={{ color: "#6a2a1c", fontSize: 14 }}>
            {error}
          </p>
        )}
        {isAdmin && (
          <div className="span2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save organization"}
            </button>
          </div>
        )}
      </form>

      <p style={{ marginTop: 20, fontSize: 14 }}>
        <Link href={`/organizations/${orgId}`} style={{ color: "var(--amber-on-bone)" }}>
          View your public organization profile →
        </Link>
      </p>
    </div>
  );
}
