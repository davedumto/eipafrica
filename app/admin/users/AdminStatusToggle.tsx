"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminStatusToggle({
  userId,
  email,
  isAdmin,
  isSelf,
}: {
  userId: string;
  email: string;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(nextIsAdmin: boolean, confirmValue?: string) {
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/admin/users/${userId}/admin-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: nextIsAdmin, confirmEmail: confirmValue }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Could not update admin status.");
      return;
    }
    setConfirming(false);
    setConfirmEmail("");
    router.refresh();
  }

  function revoke() {
    if (!window.confirm(`Revoke admin access for ${email}?`)) return;
    submit(false);
  }

  if (isSelf) {
    return <span style={{ fontSize: 13, color: "var(--on-bone-faint)" }}>You</span>;
  }

  if (isAdmin) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <button className="btn-outline" type="button" disabled={saving} onClick={revoke}>
          {saving ? "Saving…" : "Revoke admin"}
        </button>
        {error && <span style={{ color: "#6a2a1c", fontSize: 12 }}>{error}</span>}
      </div>
    );
  }

  if (confirming) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, maxWidth: 260 }}>
        <p style={{ fontSize: 12, color: "var(--on-bone-faint)", textAlign: "right" }}>
          Type <strong>{email}</strong> to confirm granting admin access.
        </p>
        <input
          type="text"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          placeholder="Confirm email"
          style={{
            border: "1px solid rgba(16,17,20,0.22)",
            borderRadius: 999,
            padding: "0 14px",
            minHeight: 36,
            fontSize: 13,
            width: "100%",
          }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-outline"
            type="button"
            onClick={() => {
              setConfirming(false);
              setConfirmEmail("");
              setError(null);
            }}
          >
            Cancel
          </button>
          <button
            className="btn-dark"
            type="button"
            disabled={saving || confirmEmail.toLowerCase().trim() !== email.toLowerCase()}
            onClick={() => submit(true, confirmEmail)}
          >
            {saving ? "Saving…" : "Grant admin"}
          </button>
        </div>
        {error && <span style={{ color: "#6a2a1c", fontSize: 12 }}>{error}</span>}
      </div>
    );
  }

  return (
    <button className="btn-outline" type="button" onClick={() => setConfirming(true)}>
      Make admin
    </button>
  );
}
