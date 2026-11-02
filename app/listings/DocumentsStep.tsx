"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/app/components/Toaster";

type Doc = { id: string; filename: string; tag: "public" | "confidential"; createdAt: string };

const TAG_OPTIONS = [
  { value: "public", label: "Public — anyone can download" },
  { value: "confidential", label: "Confidential — request access required" },
];

export default function DocumentsStep({ listingId }: { listingId?: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tag, setTag] = useState<"public" | "confidential">("public");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tag dropdown — self-contained, not a shared component.
  const [tagOpen, setTagOpen] = useState(false);
  const tagRootRef = useRef<HTMLDivElement>(null);
  const tagSelected = TAG_OPTIONS.find((o) => o.value === tag);

  useEffect(() => {
    if (!listingId) {
      setLoadingDocs(false);
      return;
    }
    fetch(`/api/listings/${listingId}/documents`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setDocs(Array.isArray(data) ? data : []))
      .finally(() => setLoadingDocs(false));
  }, [listingId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !listingId) return;
    setError(null);
    setUploading(true);

    const form = new FormData();
    form.append("file", file);
    form.append("tag", tag);

    const res = await fetch(`/api/listings/${listingId}/documents`, {
      method: "POST",
      body: form,
    });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.error ?? "Could not upload this file.";
      setError(message);
      showToast(message, "error");
      return;
    }

    const doc = await res.json();
    setDocs((d) => [...d, doc]);
    showToast(`${file.name} uploaded.`, "success");
  }

  async function handleDelete(docId: string, filename: string) {
    if (!listingId) return;
    const res = await fetch(`/api/listings/${listingId}/documents/${docId}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("Could not remove this document.", "error");
      return;
    }
    setDocs((d) => d.filter((doc) => doc.id !== docId));
    showToast(`${filename} removed.`, "success");
  }

  if (!listingId) {
    return (
      <div className="empty" style={{ borderBottom: 0, textAlign: "left" }}>
        Save this listing first (go back a step, or continue — a draft is created automatically) before
        uploading documents.
      </div>
    );
  }

  return (
    <div>
      <div className="gf-field" style={{ maxWidth: 420 }}>
        <label id="doc-tag-label">Document visibility</label>
        <div className={`xselect${tagOpen ? " open" : ""}`} ref={tagRootRef}>
          <button
            type="button"
            className="xselect-trigger"
            aria-haspopup="listbox"
            aria-expanded={tagOpen}
            aria-labelledby="doc-tag-label"
            onClick={() => setTagOpen((o) => !o)}
          >
            <span className="xselect-value">{tagSelected?.label}</span>
            <span className="xselect-chevron" aria-hidden="true" />
          </button>
          {tagOpen && (
            <>
              <div className="xselect-backdrop" onClick={() => setTagOpen(false)} />
              <ul className="xselect-list" role="listbox" aria-labelledby="doc-tag-label">
                {TAG_OPTIONS.map((opt) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={opt.value === tag}
                    className={`xselect-opt${opt.value === tag ? " selected" : ""}`}
                    onClick={() => {
                      setTag(opt.value as "public" | "confidential");
                      setTagOpen(false);
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

      <div style={{ marginTop: 16 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,.webp"
          onChange={handleUpload}
          disabled={uploading}
          style={{ display: "none" }}
          id="doc-file-input"
        />
        <label htmlFor="doc-file-input" className="btn-outline" style={{ cursor: "pointer", display: "inline-flex" }}>
          {uploading ? "Uploading…" : "Choose a file to upload"}
        </label>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--on-bone-faint)" }}>
          PDF, Excel, Word, CSV or image. Up to 25MB.
        </p>
      </div>

      {error && (
        <p role="alert" style={{ color: "#6a2a1c", marginTop: 12, fontSize: 14 }}>
          {error}
        </p>
      )}

      <div style={{ marginTop: 24 }}>
        {loadingDocs ? (
          <p style={{ fontSize: 14, color: "var(--on-bone-faint)" }}>Loading documents…</p>
        ) : docs.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--on-bone-faint)" }}>No documents uploaded yet.</p>
        ) : (
          <div className="doclist">
            {docs.map((d) => (
              <div className="docrow" key={d.id}>
                <span className="name">
                  {d.filename}
                  <span className={`doctag${d.tag === "confidential" ? " confidential" : ""}`}>
                    {d.tag === "confidential" ? "Confidential" : "Public"}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ minHeight: 36, padding: "0 16px" }}
                  onClick={() => handleDelete(d.id, d.filename)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
