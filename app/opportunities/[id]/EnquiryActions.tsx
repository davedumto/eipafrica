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
      <button className="btn-outline" type="button" onClick={() => open("question")} disabled={sent.question}>
        {sent.question ? "Question sent" : "Ask a question"}
      </button>
      <button
        className="btn-outline"
        type="button"
        onClick={() => open("document_request")}
        disabled={sent.document_request}
      >
        {sent.document_request ? "Request sent" : "Request documents"}
      </button>
      {isTender && (
        <p className="eyebrow" style={{ color: "var(--on-bone-faint)", textTransform: "none" }}>
          Bid submission is coming soon.
        </p>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn-outline" type="button" onClick={toggleSave} disabled={savePending}>
          {saved ? "Saved" : "Save"}
        </button>
        <button className="btn-outline" type="button" onClick={share}>
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
