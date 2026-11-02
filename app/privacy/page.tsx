import AppBar from "@/app/components/AppBar";

export const instant = false;

export default function PrivacyPage() {
  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in" style={{ maxWidth: "72ch" }}>
          <p className="eyebrow">LEGAL</p>
          <h1 style={{ marginTop: 14, fontSize: "clamp(32px,4vw,44px)" }}>Privacy Policy</h1>
          <p style={{ marginTop: 10, fontSize: 13, color: "var(--on-bone-faint)" }}>Last updated: November 2026</p>

          <div
            style={{
              marginTop: 24,
              padding: "16px 18px",
              borderRadius: 14,
              background: "#f3e3bd",
              color: "#5a3b00",
              fontSize: 14,
              border: "1px solid rgba(122,79,0,0.25)",
            }}
          >
            <strong>Draft notice:</strong> this is a working draft describing what data EIP Africa
            currently collects and how it is used. It has not yet been reviewed by a lawyer and should
            not be relied on as a final, binding privacy policy until that review is complete.
          </div>

          <section className="detail-section">
            <h2>1. What we collect</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              When you create an account, we collect your name, email address and a securely hashed
              password. When you create or join an organization, we store the organization&rsquo;s name
              and your role within it. When you post a listing, we store the listing details you provide,
              including any documents you upload. When you message another user or request access to a
              document, we store that message and a record of the request so both sides can refer back to
              it.
            </p>
          </section>

          <section className="detail-section">
            <h2>2. Document access logging</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              Confidential documents are only released after the listing owner approves a request. Every
              download of every document — public or confidential — is logged with the downloading
              user&rsquo;s identity and timestamp, so listing owners can see who has accessed their
              materials.
            </p>
          </section>

          <section className="detail-section">
            <h2>3. How we use your data</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              We use your data to operate the platform: to show you listings, deliver your messages and
              enquiries, send you email and in-app notifications about activity on your account (new
              enquiries, replies, listing approvals), and to let you sign in and manage your organization.
              We do not sell your data to third parties.
            </p>
          </section>

          <section className="detail-section">
            <h2>4. Service providers</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              We use third-party infrastructure providers to operate the platform, including a database
              provider to store your data, a file storage provider to host uploaded documents, an email
              provider to deliver notification emails, and a real-time messaging provider to deliver
              in-app notifications and chat updates. Each of these providers processes data only as
              needed to provide their service to us.
            </p>
          </section>

          <section className="detail-section">
            <h2>5. Listing visibility and anonymity</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              Listing owners choose who can see their listing (public, members only, or private by
              invitation) and may hide their organization&rsquo;s name until they accept an enquiry.
              Browsing listing cards does not require an account; viewing full listing details does.
            </p>
          </section>

          <section className="detail-section">
            <h2>6. Data retention and deletion</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              We retain your data for as long as your account is active. You can delete your own draft or
              pending-review listings at any time from your dashboard. To request deletion of your
              account or data, contact us through the details on our homepage.
            </p>
          </section>

          <section className="detail-section">
            <h2>7. Cookies and sessions</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              We use a single session cookie to keep you signed in. We do not use third-party advertising
              or tracking cookies.
            </p>
          </section>

          <section className="detail-section">
            <h2>8. Changes to this policy</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              We may update this policy from time to time. Continued use of the platform after a change
              takes effect means you accept the updated policy.
            </p>
          </section>

          <section className="detail-section">
            <h2>9. Contact</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              Questions about this policy, or requests to access or delete your data, can be sent through
              the contact details on our homepage.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
