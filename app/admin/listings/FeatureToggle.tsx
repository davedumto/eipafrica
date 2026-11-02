"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FeatureToggle({
  listingId,
  isFeatured,
}: {
  listingId: string;
  isFeatured: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/admin/listings/${listingId}/feature`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !isFeatured }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not update featured status.");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <button className={isFeatured ? "btn-outline" : "btn-dark"} type="button" disabled={saving} onClick={toggle}>
        {saving ? "Saving…" : isFeatured ? "Unfeature" : "Feature"}
      </button>
      {error && <span style={{ color: "#6a2a1c", fontSize: 12 }}>{error}</span>}
    </div>
  );
}
