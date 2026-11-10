"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ModalKind = "interest" | "question" | "document_request" | null;

const COPY: Record<Exclude<ModalKind, null>, { title: string; placeholder: string; cta: string }> = {
  interest: {
    title: "Express interest",
    placeholder: "Tell the owner a bit about why you're interested (optional).",
    cta: "Send interest",
  },
  question: {
    title: "Ask a question",
    placeholder: "What would you like to know?",
    cta: "Send question",
  },
  document_request: {
    title: "Request documents",
    placeholder: "Let the owner know which documents you need (optional).",
    cta: "Request documents",
  },
};

export default function EnquiryActions({
  listingId,
  isLoggedIn,
  isTender,
  initiallySaved,
}: {
  listingId: string;
  isLoggedIn: boolean;
  isTender: boolean;
  initiallySaved: boolean;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalKind>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(initiallySaved);
  const [savePending, setSavePending] = useState(false);

  function open(kind: Exclude<ModalKind, null>) {
    if (!isLoggedIn) {
      router.push(`/login?next=/opportunities/${listingId}`);
      return;
    }
    setMessage("");
    setModal(kind);
  }

  async function submit() {
    if (!modal) return;
    setSending(true);
    const res = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, type: modal, message }),
    });
    setSending(false);
    if (res.ok) {
      setSent((s) => ({ ...s, [modal]: true }));
      setModal(null);
    }
  }

  async function toggleSave() {
    if (!isLoggedIn) {
      router.push(`/login?next=/opportunities/${listingId}`);
      return;
    }
    setSavePending(true);
    const res = await fetch("/api/saved-listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    if (res.ok) {
      const data = await res.json();
      setSaved(data.saved);
    }
    setSavePending(false);
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setSent((s) => ({ ...s, share: true }));
      setTimeout(() => setSent((s) => ({ ...s, share: false })), 2000);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <>
      <button className="btn-primary" type="button" onClick={() => open("interest")} disabled={sent.interest}>
        {sent.interest ? "Interest sent" : "Express interest"}
      </button>
      <button className="btn-outline" type="button" onClick={() => open("question")} disabled={sent.question} style={{ gap: 8 }}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M2 3h12v8H5.5L2 14V3Z" strokeLinejoin="round" />
          <path d="M5 6.5h6M5 9h4" strokeLinecap="round" />
        </svg>
        {sent.question ? "Question sent" : "Ask a question"}
      </button>
      <button
        className="btn-outline"
        type="button"
        onClick={() => open("document_request")}
        disabled={sent.document_request}
        style={{ gap: 8 }}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M4 1.5h5.5L13 5v9.5H4Z" strokeLinejoin="round" />
          <path d="M9.5 1.5V5H13" strokeLinejoin="round" />
        </svg>
        {sent.document_request ? "Request sent" : "Request documents"}
      </button>
      {isTender && (
        <p className="eyebrow" style={{ color: "var(--on-bone-faint)", textTransform: "none" }}>
          Bid submission is coming soon.
        </p>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn-outline" type="button" onClick={toggleSave} disabled={savePending} style={{ flex: 1, gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M4 2h8v12l-4-2.5L4 14V2Z" strokeLinejoin="round" />
          </svg>
          {saved ? "Saved" : "Save"}
        </button>
        <button className="btn-outline" type="button" onClick={share} style={{ flex: 1, gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="12.5" cy="3.5" r="1.75" />
            <circle cx="3.5" cy="8" r="1.75" />
            <circle cx="12.5" cy="12.5" r="1.75" />
            <path d="M5.1 7.1 11 4.4M5.1 8.9 11 11.6" strokeLinecap="round" />
          </svg>
          {sent.share ? "Link copied" : "Share"}
        </button>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button className="close" type="button" aria-label="Close" onClick={() => setModal(null)}>
              ×
            </button>
            <h2>{COPY[modal].title}</h2>
            <div className="modal-field">
              <label htmlFor="enquiry-message">Message</label>
              <textarea
                id="enquiry-message"
                rows={4}
                placeholder={COPY[modal].placeholder}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-primary" type="button" onClick={submit} disabled={sending}>
                {sending ? "Sending…" : COPY[modal].cta}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
