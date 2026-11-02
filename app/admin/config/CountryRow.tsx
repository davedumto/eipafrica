"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { showToast } from "@/app/components/Toaster";

export default function CountryRow({
  id,
  name,
  code,
  isActive,
}: {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function toggleActive() {
    setPending(true);
    const res = await fetch(`/api/admin/countries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Could not update this country.", "error");
      return;
    }
    showToast(isActive ? `${name} deactivated.` : `${name} reactivated.`, "success");
    router.refresh();
  }

  async function deleteCountry() {
    setPending(true);
    const res = await fetch(`/api/admin/countries/${id}`, { method: "DELETE" });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Could not delete this country.", "error");
      return;
    }
    setConfirmingDelete(false);
    showToast(`${name} deleted.`, "success");
    router.refresh();
  }

  return (
    <div className="dash-row" style={{ cursor: "default", padding: "12px 16px" }}>
      <div className="dash-row-main" style={{ minWidth: 160 }}>
        <p className="dash-row-title" style={{ fontSize: 14 }}>
          {name} <span style={{ color: "var(--on-bone-faint)" }}>({code})</span>
        </p>
        <p className="dash-row-meta">{isActive ? "Active" : "Inactive"}</p>
      </div>
      <div className="dash-row-actions">
        <button type="button" className="btn-outline" style={{ minHeight: 32, padding: "0 14px" }} disabled={pending} onClick={toggleActive}>
          {isActive ? "Deactivate" : "Reactivate"}
        </button>
        <button
          type="button"
          className="btn-outline"
          style={{ minHeight: 32, padding: "0 14px" }}
          disabled={pending}
          onClick={() => setConfirmingDelete(true)}
        >
          Delete
        </button>
      </div>

      {confirmingDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmingDelete(false)}>
          <div className="modal" style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button className="close" type="button" aria-label="Close" onClick={() => setConfirmingDelete(false)}>
              ×
            </button>
            <h2>Delete {name}?</h2>
            <p style={{ color: "var(--on-bone-muted)", fontSize: 14 }}>
              This only works if no listings reference it. If any do, deactivate it instead.
            </p>
            <div className="modal-actions" style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn-outline" type="button" onClick={() => setConfirmingDelete(false)} disabled={pending}>
                Cancel
              </button>
              <button className="btn-danger" type="button" onClick={deleteCountry} disabled={pending}>
                {pending ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
