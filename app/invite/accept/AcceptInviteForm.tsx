"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

type Status = "idle" | "accepting" | "accepted" | "error";

export default function AcceptInviteForm() {
  const { status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !token || status !== "idle") return;

    setStatus("accepting");
    fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Could not accept this invite.");
          setStatus("error");
          return;
        }
        setOrgName(data.organization?.name ?? null);
        setStatus("accepted");
      })
      .catch(() => {
        setError("Could not accept this invite. Check your connection and try again.");
        setStatus("error");
      });
  }, [sessionStatus, token, status]);

  const loginNext = encodeURIComponent(`/invite/accept?token=${token}`);

  return (
    <div className="auth-shell">
      <Link href="/" className="auth-logo" aria-label="EIP Africa home">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f0b34a" strokeWidth="1.5" aria-hidden="true">
          <rect x="2.75" y="2.75" width="18.5" height="18.5" />
          <path d="M2.75 21.25 21.25 2.75" />
          <path d="M12 12v9.25" />
        </svg>
        <span>EIP Africa</span>
      </Link>

      <div className="auth-card">
        <p className="eyebrow">ORGANIZATION INVITE</p>
        <h1>Join your team</h1>

        {!token && (
          <p className="auth-error" style={{ marginTop: 20 }}>
            This invite link is missing its token. Ask whoever invited you to resend it.
          </p>
        )}

        {token && sessionStatus === "loading" && (
          <p className="lede" style={{ marginTop: 16 }}>
            Checking your session…
          </p>
        )}

        {token && sessionStatus === "unauthenticated" && (
          <>
            <p className="lede" style={{ marginTop: 16 }}>
              Log in or create an account to accept this invite.
            </p>
            <div className="auth-form">
              <Link href={`/login?tab=login&next=${loginNext}`} className="btn-primary">
                Log in
              </Link>
              <Link href={`/login?tab=signup&next=${loginNext}`} className="btn-outline">
                Create an account
              </Link>
            </div>
          </>
        )}

        {token && sessionStatus === "authenticated" && status === "accepting" && (
          <p className="lede" style={{ marginTop: 16 }}>
            Joining the organization…
          </p>
        )}

        {status === "accepted" && (
          <>
            <p className="lede" style={{ marginTop: 16 }}>
              You've joined {orgName ?? "the organization"}.
            </p>
            <div className="auth-form">
              <Link href="/account/organization" className="btn-primary">
                Go to your organization
              </Link>
            </div>
          </>
        )}

        {status === "error" && (
          <p className="auth-error" style={{ marginTop: 20 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
