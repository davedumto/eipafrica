"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { showToast } from "@/app/components/Toaster";

const STATUS_VERB: Record<string, string> = {
  paused: "paused",
  live: "resumed",
  closed: "closed",
};

export default function ListingRowActions({ id, status, title }: { id: string; status: string; title: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function changeStatus(nextStatus: string) {
    setPending(nextStatus);
    setError(null);
    const res = await fetch(`/api/listings/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setPending(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.error ?? "Could not update this listing.";
      setError(message);
      showToast(message, "error");
      return;
    }
    showToast(`Listing ${STATUS_VERB[nextStatus] ?? "updated"}.`, "success");
    router.refresh();
  }

  async function deleteListing() {
    setPending("delete");
    setError(null);
    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    setPending(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.error ?? "Could not delete this listing.";
      setError(message);
      showToast(message, "error");
      return;
    }
    setConfirmingDelete(false);
    showToast(title ? `“${title}” was deleted.` : "Listing deleted.", "success");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
      <div className="dash-row-actions">
        {(status === "draft" || status === "pending_review") && (
          <>
            <a className="btn-outline" href={`/listings/${id}/edit`} style={{ minHeight: 36, padding: "0 16px" }}>
              Continue editing
            </a>
            <button
              type="button"
              className="btn-outline"
              style={{ minHeight: 36, padding: "0 16px" }}
              disabled={pending !== null}
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </button>
          </>
        )}
        {status === "live" && (
          <>
            <a className="btn-outline" href={`/opportunities/${id}`} style={{ minHeight: 36, padding: "0 16px" }}>
              View
            </a>
            <a className="btn-outline" href={`/listings/${id}/edit`} style={{ minHeight: 36, padding: "0 16px" }}>
              Edit
            </a>
            <button
              className="btn-outline"
              type="button"
              style={{ minHeight: 36, padding: "0 16px" }}
              disabled={pending !== null}
              onClick={() => changeStatus("paused")}
            >
              {pending === "paused" ? "Pausing…" : "Pause"}
            </button>
            <button
              className="btn-outline"
              type="button"
              style={{ minHeight: 36, padding: "0 16px" }}
              disabled={pending !== null}
              onClick={() => changeStatus("closed")}
            >
              {pending === "closed" ? "Closing…" : "Close"}
            </button>
          </>
        )}
        {status === "paused" && (
          <>
            <a className="btn-outline" href={`/listings/${id}/edit`} style={{ minHeight: 36, padding: "0 16px" }}>
              Edit
            </a>
            <button
              className="btn-outline"
              type="button"
              style={{ minHeight: 36, padding: "0 16px" }}
              disabled={pending !== null}
              onClick={() => changeStatus("live")}
            >
              {pending === "live" ? "Resuming…" : "Resume"}
            </button>
            <button
              className="btn-outline"
              type="button"
              style={{ minHeight: 36, padding: "0 16px" }}
              disabled={pending !== null}
              onClick={() => changeStatus("closed")}
            >
              {pending === "closed" ? "Closing…" : "Close"}
            </button>
          </>
        )}
        {status === "closed" && (
          <a className="btn-outline" href={`/listings/${id}/edit`} style={{ minHeight: 36, padding: "0 16px" }}>
            View
          </a>
        )}
      </div>
      {error && <span style={{ fontSize: 12, color: "#6a2a1c" }}>{error}</span>}

      {confirmingDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmingDelete(false)}>
          <div className="modal" style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button className="close" type="button" aria-label="Close" onClick={() => setConfirmingDelete(false)}>
              ×
            </button>
            <h2>Delete this listing?</h2>
            <p style={{ color: "var(--on-bone-muted)", fontSize: 14 }}>
              {title ? `“${title}” ` : "This listing "}will be permanently deleted, along with any enquiries or
              messages tied to it. This cannot be undone.
            </p>
            <div className="modal-actions" style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                className="btn-outline"
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={pending !== null}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                type="button"
                onClick={deleteListing}
                disabled={pending !== null}
              >
                {pending === "delete" ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
