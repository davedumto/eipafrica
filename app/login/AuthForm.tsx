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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordsMismatched = confirmTouched && confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    if (justReset) showToast("Password updated. Log in with your new password.", "success");
  }, [justReset]);

  useEffect(() => {
    setConfirmPassword("");
    setConfirmTouched(false);
  }, [tab]);

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

    if (password !== confirmPassword) {
      setConfirmTouched(true);
      setError("Passwords don't match.");
      return;
    }

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
              <div className="auth-field-password-wrap">
                <input
                  id="login-password"
                  type={showLoginPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-field-eye"
                  onClick={() => setShowLoginPassword((v) => !v)}
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                  aria-pressed={showLoginPassword}
                  tabIndex={-1}
                >
                  <EyeIcon open={showLoginPassword} />
                </button>
              </div>
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
              <div className="auth-field-password-wrap">
                <input
                  id="signup-password"
                  type={showSignupPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-field-eye"
                  onClick={() => setShowSignupPassword((v) => !v)}
                  aria-label={showSignupPassword ? "Hide password" : "Show password"}
                  aria-pressed={showSignupPassword}
                  tabIndex={-1}
                >
                  <EyeIcon open={showSignupPassword} />
                </button>
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="signup-confirm-password">Confirm password</label>
              <div className={`auth-field-password-wrap${passwordsMismatched ? " has-error" : ""}`}>
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setConfirmTouched(true)}
                  aria-invalid={passwordsMismatched}
                  aria-describedby={passwordsMismatched ? "signup-confirm-password-error" : undefined}
                  required
                />
                <button
                  type="button"
                  className="auth-field-eye"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  aria-pressed={showConfirmPassword}
                  tabIndex={-1}
                >
                  <EyeIcon open={showConfirmPassword} />
                </button>
              </div>
              {passwordsMismatched && (
                <p id="signup-confirm-password-error" role="alert" className="auth-field-hint">
                  Passwords don&rsquo;t match.
                </p>
              )}
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

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M1.5 9S4 3.5 9 3.5 16.5 9 16.5 9 14 14.5 9 14.5 1.5 9 1.5 9Z" strokeLinejoin="round" />
        <circle cx="9" cy="9" r="2.25" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path
        d="M7.3 4.13A8.3 8.3 0 0 1 9 3.95c5 0 7.5 5.05 7.5 5.05a13.86 13.86 0 0 1-2.1 2.9m-2.5 1.52A7.3 7.3 0 0 1 9 14.05c-5 0-7.5-5.05-7.5-5.05A13.76 13.76 0 0 1 4.9 5.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.3 10.7a2.25 2.25 0 0 1 3.18-3.18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 2l14 14" strokeLinecap="round" />
    </svg>
  );
}
