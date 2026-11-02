"use client";

import { useState } from "react";
import { showToast } from "@/app/components/Toaster";

type Invite = {
  id: string;
  email: string;
  role: "org_admin" | "member";
  expiresAt: string;
  createdAt: string;
};

export default function InviteForm({
  orgId,
  invites: initialInvites,
}: {
  orgId: string;
  invites: Invite[];
}) {
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);

    const res = await fetch(`/api/organizations/${orgId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);

    if (!res.ok) {
      const message = data.error ?? "Could not send this invite.";
      setError(message);
      showToast(message, "error");
      return;
    }

    setInvites((prev) => {
      const withoutExisting = prev.filter((i) => i.email !== email);
      return [
        ...withoutExisting,
        { id: crypto.randomUUID(), email, role: "member" as const, expiresAt: "", createdAt: new Date().toISOString() },
      ];
    });
    setEmail("");
    showToast(`Invite sent to ${email}.`, "success");
  }

  async function handleRevoke(invite: Invite) {
    setRevokingId(invite.id);
    const res = await fetch(`/api/organizations/${orgId}/invites/${invite.id}`, { method: "DELETE" });
    setRevokingId(null);

    if (!res.ok) {
      showToast("Could not revoke this invite.", "error");
      return;
    }

    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    showToast("Invite revoked.", "success");
  }

  return (
    <section style={{ marginTop: 40, maxWidth: 560 }}>
      <h2 style={{ fontSize: 20 }}>Invite a teammate</h2>
      <form className="wiz-grid" style={{ marginTop: 16 }} onSubmit={handleInvite}>
        <div className="gf-field span2">
          <label htmlFor="invite-email">Email</label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            required
          />
        </div>
        {error && (
          <p role="alert" className="span2" style={{ color: "#6a2a1c", fontSize: 14 }}>
            {error}
          </p>
        )}
        <div className="span2">
          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? "Sending…" : "Send invite"}
          </button>
        </div>
      </form>

      {invites.length > 0 && (
        <div className="dash-list" style={{ marginTop: 20 }}>
          {invites.map((invite) => (
            <div key={invite.id} className="dash-row" style={{ cursor: "default" }}>
              <div className="dash-row-main">
                <div>
                  <p className="dash-row-title">{invite.email}</p>
                  <p className="dash-row-meta">Pending</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-danger"
                disabled={revokingId === invite.id}
                onClick={() => handleRevoke(invite)}
              >
                {revokingId === invite.id ? "Revoking…" : "Revoke"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
