"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startNavProgress } from "@/app/components/NavProgress";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  fromUserId: string;
  fromUserName: string;
};

export default function Thread({
  enquiryId,
  listingTitle,
  listingId,
  otherParty,
  type,
  status,
  isOwner,
  currentUserId,
  initialMessages,
}: {
  enquiryId: string;
  listingTitle: string;
  listingId: string;
  otherParty: string;
  type: string;
  status: string;
  isOwner: boolean;
  currentUserId: string;
  initialMessages: Message[];
}) {
  const router = useRouter();
  const [msgs, setMsgs] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [statusState, setStatusState] = useState(status);
  const [actioning, setActioning] = useState(false);
  const msgsRef = useRef(msgs);
  msgsRef.current = msgs;

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return;

    let cancelled = false;
    let channel: import("pusher-js").Channel | undefined;
    let pusherClient: import("pusher-js").default | undefined;

    import("pusher-js").then(({ default: Pusher }) => {
      if (cancelled) return;
      pusherClient = new Pusher(key, { cluster });
      channel = pusherClient.subscribe(`enquiry-${enquiryId}`);

      channel.bind(
        "new-message",
        (data: { id: string; body: string; createdAt: string; fromUserId: string; fromUserName: string }) => {
          // Skip our own messages — already appended optimistically in send().
          if (data.fromUserId === currentUserId) return;
          if (msgsRef.current.some((m) => m.id === data.id)) return;
          setMsgs((m) => [...m, data]);
        },
      );

      channel.bind("status-changed", (data: { status: string }) => {
        setStatusState(data.status);
        router.refresh();
      });
    });

    return () => {
      cancelled = true;
      if (channel) channel.unbind_all();
      if (pusherClient) pusherClient.disconnect();
    };
  }, [enquiryId, currentUserId, router]);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const res = await fetch(`/api/enquiries/${enquiryId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setSending(false);
    if (res.ok) {
      const data = await res.json();
      setMsgs((m) => [
        ...m,
        { id: data.id, body: text, createdAt: data.createdAt, fromUserId: currentUserId, fromUserName: "You" },
      ]);
      setBody("");
    }
  }

  async function act(next: "accepted" | "declined") {
    setActioning(true);
    const res = await fetch(`/api/enquiries/${enquiryId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setActioning(false);
    if (res.ok) {
      setStatusState(next);
      startNavProgress();
      router.refresh();
    }
  }

  return (
    <div className="thread">
      <div className="thread-head">
        <div>
          <p className="eyebrow">{type.replace("_", " ").toUpperCase()}</p>
          <h1 style={{ marginTop: 10, fontSize: "clamp(24px,2.6vw,32px)" }}>{otherParty}</h1>
          <Link href={`/opportunities/${listingId}`} className="thread-listing-link">
            {listingTitle}
          </Link>
        </div>
        <span className={`thread-status thread-status--${statusState}`}>{statusState}</span>
      </div>

      {isOwner && statusState === "pending" && (
        <div className="thread-actions">
          <button className="btn-primary" type="button" onClick={() => act("accepted")} disabled={actioning}>
            {actioning ? "Working…" : "Accept"}
          </button>
          <button className="btn-outline" type="button" onClick={() => act("declined")} disabled={actioning}>
            Decline
          </button>
        </div>
      )}

      <div className="thread-messages">
        {msgs.length === 0 && <p style={{ color: "var(--on-bone-faint)" }}>No messages yet.</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`thread-bubble${m.fromUserId === currentUserId ? " mine" : ""}`}>
            <span className="thread-bubble-name">{m.fromUserId === currentUserId ? "You" : m.fromUserName}</span>
            <p>{m.body}</p>
            <span className="thread-bubble-time">{new Date(m.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>

      {statusState !== "declined" && (
        <div className="thread-reply">
          <textarea
            rows={3}
            placeholder="Write a reply…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button className="btn-primary" type="button" onClick={send} disabled={sending || !body.trim()}>
            {sending ? (
              <span className="thread-sending">
                <span className="thread-spinner" aria-hidden="true" />
                Sending…
              </span>
            ) : (
              "Send"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
