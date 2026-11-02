"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startNavProgress } from "@/app/components/NavProgress";

export default function ReviewActions({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [showSendBack, setShowSendBack] = useState(false);
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "send_back") {
    setError(null);
    if (action === "send_back" && !comments.trim()) {
      setError("Add a comment explaining what needs to change before sending this back.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/listings/${listingId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comments: comments.trim() || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not complete this action.");
      return;
    }
    startNavProgress();
    router.push("/admin");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
      {error && (
        <p
          role="alert"
          style={{
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

      {!showSendBack ? (
        <>
          <button className="btn-primary" type="button" disabled={saving} onClick={() => act("approve")}>
            {saving ? "Approving…" : "Approve"}
          </button>
          <button className="btn-outline" type="button" disabled={saving} onClick={() => setShowSendBack(true)}>
            Send back with comments
          </button>
        </>
      ) : (
        <>
          <div className="gf-field">
            <label htmlFor="review-comments">What needs to change</label>
            <textarea
              id="review-comments"
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. Please add a short summary and confirm the deal size."
            />
          </div>
          <button className="btn-primary" type="button" disabled={saving} onClick={() => act("send_back")}>
            {saving ? "Sending…" : "Send back to draft"}
          </button>
          <button className="btn-outline" type="button" disabled={saving} onClick={() => setShowSendBack(false)}>
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
