"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startNavProgress } from "./NavProgress";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((n) => !n.readAt).length;

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .finally(() => setLoaded(true));
  }, []);

  // Live delivery via the same per-user Pusher channel pattern used by Thread.tsx.
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
      channel = pusherClient.subscribe(`user-${userId}`);
      channel.bind("new-notification", (data: Notification) => {
        setItems((prev) => (prev.some((n) => n.id === data.id) ? prev : [data, ...prev]));
      });
    });

    return () => {
      cancelled = true;
      if (channel) channel.unbind_all();
      if (pusherClient) pusherClient.disconnect();
    };
  }, [userId]);

  // Close on outside click — bubble-phase pointerdown, never onBlur (which
  // fires before a click on a row inside the panel and would close it first).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    await fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => {});
  }

  async function markAllRead() {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
  }

  function onRowClick(n: Notification) {
    if (!n.readAt) markRead(n.id);
    setOpen(false);
    if (n.linkUrl) {
      startNavProgress();
      router.push(n.linkUrl);
    }
  }

  return (
    <div className={`notif-bell${open ? " open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="notif-bell-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M5 8a5 5 0 0 1 10 0c0 3.5 1.2 4.8 1.8 5.4.3.3.1.8-.3.8H3.5c-.4 0-.6-.5-.3-.8C3.8 12.8 5 11.5 5 8Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 16.5a2 2 0 0 0 4 0" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && <span className="appbar-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="menu">
          <div className="notif-panel-head">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button type="button" className="notif-mark-all" onClick={markAllRead}>
                Mark all as read
              </button>
            )}
          </div>
          <div className="notif-list">
            {!loaded ? (
              <p className="notif-empty">Loading…</p>
            ) : items.length === 0 ? (
              <p className="notif-empty">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <button
                  type="button"
                  key={n.id}
                  className={`notif-row${n.readAt ? "" : " unread"}`}
                  onClick={() => onRowClick(n)}
                >
                  <span className="notif-row-title">{n.title}</span>
                  {n.body && <span className="notif-row-body">{n.body}</span>}
                  <span className="notif-row-time">{timeAgo(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
