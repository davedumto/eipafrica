"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OnboardingForm({ next }: { next?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
      return;
    }

    router.push(next ?? "/");
  }

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
        <p className="eyebrow">LAST STEP</p>
        <h1>Create your organization</h1>
        <p className="lede">This is the company you post or browse listings as. You can invite teammates later.</p>

        {error && <p className="auth-error">{error}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="org-name">Organization name</label>
            <input id="org-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating…" : "Create organization"}
          </button>
        </form>
      </div>
    </div>
  );
}
