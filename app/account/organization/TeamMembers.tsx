"use client";

import { useState } from "react";
import { showToast } from "@/app/components/Toaster";

type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "org_admin" | "member";
  joinedAt: string;
};

export default function TeamMembers({
  orgId,
  members: initialMembers,
  currentUserId,
  isAdmin,
}: {
  orgId: string;
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const adminCount = members.filter((m) => m.role === "org_admin").length;

  async function handleRemove(member: Member) {
    if (!window.confirm(`Remove ${member.name} from this organization?`)) return;

    setRemovingId(member.id);
    const res = await fetch(`/api/organizations/${orgId}/members/${member.id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    setRemovingId(null);

    if (!res.ok) {
      showToast(data.error ?? "Could not remove this member.", "error");
      return;
    }

    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    showToast(`${member.name} removed from the organization.`, "success");
  }

  return (
    <section style={{ marginTop: 40, maxWidth: 560 }}>
      <h2 style={{ fontSize: 20 }}>Team members</h2>
      <div className="dash-list" style={{ marginTop: 16 }}>
        {members.map((member) => {
          const isLastAdmin = member.role === "org_admin" && adminCount <= 1;
          const canRemove = isAdmin && member.userId !== currentUserId && !isLastAdmin;
          return (
            <div key={member.id} className="dash-row" style={{ cursor: "default" }}>
              <div className="dash-row-main">
                <div>
                  <p className="dash-row-title">
                    {member.name}
                    {member.userId === currentUserId && (
                      <span style={{ marginLeft: 8, fontSize: 13, color: "var(--on-bone-faint)" }}>(you)</span>
                    )}
                  </p>
                  <p className="dash-row-meta">
                    {member.email} · {member.role === "org_admin" ? "Admin" : "Member"} · Joined{" "}
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {canRemove && (
                <button
                  type="button"
                  className="btn-danger"
                  disabled={removingId === member.id}
                  onClick={() => handleRemove(member)}
                >
                  {removingId === member.id ? "Removing…" : "Remove"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {!isAdmin && (
        <p style={{ marginTop: 12, fontSize: 14, color: "var(--on-bone-faint)" }}>
          Only an organization admin can remove members.
        </p>
      )}
    </section>
  );
}
