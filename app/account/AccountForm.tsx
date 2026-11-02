"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { showToast } from "@/app/components/Toaster";

export default function AccountForm({
  firstName: initialFirstName,
  lastName: initialLastName,
  email: initialEmail,
  emailAlertsEnabled: initialEmailAlertsEnabled,
}: {
  firstName: string;
  lastName: string;
  email: string;
  emailAlertsEnabled: boolean;
}) {
  const { update } = useSession();

  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(initialEmailAlertsEnabled);
  const [emailAlertsSaving, setEmailAlertsSaving] = useState(false);

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);
  const [profilePassword, setProfilePassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSaving(true);

    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, currentPassword: profilePassword }),
    });
    const data = await res.json().catch(() => ({}));
    setProfileSaving(false);

    if (!res.ok) {
      const message = data.error ?? "Could not update your profile.";
      setProfileError(message);
      showToast(message, "error");
      return;
    }

    setProfilePassword("");
    await update({ name: data.name, email: data.email });
    showToast("Profile updated.", "success");
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }

    setPasswordSaving(true);
    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setPasswordSaving(false);

    if (!res.ok) {
      const message = data.error ?? "Could not change your password.";
      setPasswordError(message);
      showToast(message, "error");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    showToast("Password changed.", "success");
  }

  async function handleEmailAlertsToggle(next: boolean) {
    setEmailAlertsEnabled(next);
    setEmailAlertsSaving(true);

    const res = await fetch("/api/account/email-alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    setEmailAlertsSaving(false);

    if (!res.ok) {
      setEmailAlertsEnabled(!next);
      showToast("Could not update your email alert preference.", "error");
      return;
    }

    showToast(next ? "Email alerts turned on." : "Email alerts turned off.", "success");
  }

  return (
    <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 40, maxWidth: 480 }}>
      <section>
        <h2 style={{ fontSize: 20 }}>Profile</h2>
        <form className="wiz-grid" style={{ marginTop: 16 }} onSubmit={handleProfileSubmit}>
          <div className="gf-field">
            <label htmlFor="account-first-name">First name</label>
            <input
              id="account-first-name"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="gf-field">
            <label htmlFor="account-last-name">Last name</label>
            <input
              id="account-last-name"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <div className="gf-field span2">
            <label htmlFor="account-email">Email</label>
            <input
              id="account-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="gf-field span2">
            <label htmlFor="account-profile-password">Current password</label>
            <input
              id="account-profile-password"
              type="password"
              autoComplete="current-password"
              value={profilePassword}
              onChange={(e) => setProfilePassword(e.target.value)}
              placeholder="Confirm it's you to save changes"
              required
            />
          </div>
          {profileError && (
            <p role="alert" className="span2" style={{ color: "#6a2a1c", fontSize: 14 }}>
              {profileError}
            </p>
          )}
          <div className="span2">
            <button type="submit" className="btn-primary" disabled={profileSaving}>
              {profileSaving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: 20 }}>Password</h2>
        <form className="wiz-grid" style={{ marginTop: 16 }} onSubmit={handlePasswordSubmit}>
          <div className="gf-field span2">
            <label htmlFor="account-current-password">Current password</label>
            <input
              id="account-current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="gf-field span2">
            <label htmlFor="account-new-password">New password</label>
            <input
              id="account-new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="gf-field span2">
            <label htmlFor="account-confirm-password">Confirm new password</label>
            <input
              id="account-confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {passwordError && (
            <p role="alert" className="span2" style={{ color: "#6a2a1c", fontSize: 14 }}>
              {passwordError}
            </p>
          )}
          <div className="span2">
            <button type="submit" className="btn-primary" disabled={passwordSaving}>
              {passwordSaving ? "Changing…" : "Change password"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: 20 }}>Email alerts</h2>
        <label
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: emailAlertsSaving ? "default" : "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={emailAlertsEnabled}
            disabled={emailAlertsSaving}
            onChange={(e) => handleEmailAlertsToggle(e.target.checked)}
          />
          <span style={{ color: "var(--on-bone-muted)", fontSize: 15 }}>
            Email me about new enquiries, messages, listing updates and deadlines
          </span>
        </label>
      </section>
    </div>
  );
}
