"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { showToast } from "@/app/components/Toaster";

type Tab = "login" | "signup";

export default function AuthForm({
  initialTab,
  next,
  justReset,
}: {
  initialTab: Tab;
  next?: string;
  justReset?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);

  // Shared fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Signup-only
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (justReset) showToast("Password updated. Log in with your new password.", "success");
  }, [justReset]);

  function onboardingHref() {
    return next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding";
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(next ?? "/");
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (signInRes?.error) {
      setError("Account created, but automatic sign-in failed. Please log in.");
      setTab("login");
      return;
    }

    router.push(onboardingHref());
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
        <p className="eyebrow">{tab === "login" ? "WELCOME BACK" : "GET STARTED"}</p>
        <h1>{tab === "login" ? "Log in" : "Create your account"}</h1>
        <p className="lede">
          {tab === "login"
            ? "Access your listings, enquiries and messages."
            : "List a project, asset or need, or browse what others are offering."}
        </p>

        <div className="auth-tabs" role="tablist" aria-label="Log in or sign up">
          <a
            role="tab"
            aria-selected={tab === "login"}
            className={tab === "login" ? "on" : ""}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setError(null);
              setTab("login");
            }}
          >
            Log in
          </a>
          <a
            role="tab"
            aria-selected={tab === "signup"}
            className={tab === "signup" ? "on" : ""}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setError(null);
              setTab("signup");
            }}
          >
            Sign up
          </a>
        </div>

        {error && <p className="auth-error">{error}</p>}

        {tab === "login" ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="auth-forgot">
              <Link href="/forgot-password">Forgot password?</Link>
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSignup}>
            <div className="auth-field">
              <label htmlFor="signup-first-name">First name</label>
              <input
                id="signup-first-name"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="signup-last-name">Last name</label>
              <input
                id="signup-last-name"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}

        <p className="auth-foot">
          {tab === "login" ? (
            <>
              No account yet?{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setError(null);
                  setTab("signup");
                }}
              >
                Sign up
              </a>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setError(null);
                  setTab("login");
                }}
              >
                Log in
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
