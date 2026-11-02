"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { showToast } from "@/app/components/Toaster";

export default function ListingTypeRow({
  id,
  name,
  slug,
  isActive,
  fieldCount,
  badgeClass,
}: {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  fieldCount: number;
  badgeClass: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function toggleActive() {
    setPending(true);
    const res = await fetch(`/api/admin/listing-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Could not update this listing type.", "error");
      return;
    }
    showToast(isActive ? `"${name}" deactivated.` : `"${name}" reactivated.`, "success");
    router.refresh();
  }

  async function deleteType() {
    setPending(true);
    const res = await fetch(`/api/admin/listing-types/${id}`, { method: "DELETE" });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Could not delete this listing type.", "error");
      return;
    }
    setConfirmingDelete(false);
    showToast(`"${name}" deleted.`, "success");
    router.refresh();
  }

  return (
    <div className="dash-row" style={{ cursor: "default" }}>
      <div className="dash-row-main">
        <span className={`badge ${badgeClass}`}>{name}</span>
        <div>
          <p className="dash-row-title">{slug}</p>
          <p className="dash-row-meta">
            {fieldCount} custom field{fieldCount === 1 ? "" : "s"} · {isActive ? "Active" : "Inactive"}
          </p>
        </div>
      </div>
      <div className="dash-row-actions">
        <Link className="btn-outline" href={`/admin/config/listing-types/${id}/edit`} style={{ minHeight: 36, padding: "0 16px" }}>
          Edit
        </Link>
        <button
          type="button"
          className="btn-outline"
          style={{ minHeight: 36, padding: "0 16px" }}
          disabled={pending}
          onClick={toggleActive}
        >
          {isActive ? "Deactivate" : "Reactivate"}
        </button>
        <button
          type="button"
          className="btn-outline"
          style={{ minHeight: 36, padding: "0 16px" }}
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
            <h2>Delete this listing type?</h2>
            <p style={{ color: "var(--on-bone-muted)", fontSize: 14 }}>
              &ldquo;{name}&rdquo; will be permanently deleted. This only works if no listings use it — if any do,
              deactivate it instead.
            </p>
            <div className="modal-actions" style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn-outline" type="button" onClick={() => setConfirmingDelete(false)} disabled={pending}>
                Cancel
              </button>
              <button className="btn-danger" type="button" onClick={deleteType} disabled={pending}>
                {pending ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
