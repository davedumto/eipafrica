"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyToggle({
  organizationId,
  isVerified,
}: {
  organizationId: string;
  isVerified: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/admin/organizations/${organizationId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified: !isVerified }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not update verification.");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <button className={isVerified ? "btn-outline" : "btn-dark"} type="button" disabled={saving} onClick={toggle}>
        {saving ? "Saving…" : isVerified ? "Revoke verification" : "Verify organization"}
      </button>
      {error && <span style={{ color: "#6a2a1c", fontSize: 12 }}>{error}</span>}
    </div>
  );
}
