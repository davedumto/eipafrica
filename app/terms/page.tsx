import AppBar from "@/app/components/AppBar";

export default function TermsPage() {
  return (
    <div className="appshell">
      <AppBar />
      <main className="sec light">
        <div className="in" style={{ maxWidth: "72ch" }}>
          <p className="eyebrow">LEGAL</p>
          <h1 style={{ marginTop: 14, fontSize: "clamp(32px,4vw,44px)" }}>Terms of Service</h1>
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
            <strong>Draft notice:</strong> this is a working draft describing how EIP Africa currently
            operates. It has not yet been reviewed by a lawyer and should not be relied on as final,
            binding legal terms until that review is complete.
          </div>

          <section className="detail-section">
            <h2>1. What EIP Africa is</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              EIP Africa is an online marketplace where energy and infrastructure opportunities in
              Africa — projects seeking investment, EPC mandates, tenders, asset sales, investor
              mandates and company profiles — are listed, organized and connected with the people who
              can fund, build, supply or buy them. We provide the platform; we are not a party to any
              deal, financing or transaction between users.
            </p>
          </section>

          <section className="detail-section">
            <h2>2. Accounts and organizations</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              You must create an account to post a listing or view full listing details. You are
              responsible for the accuracy of the information you provide, for keeping your password
              secure, and for all activity under your account. Listings are posted on behalf of an
              organization; an organization&rsquo;s admin is responsible for the listings and team
              members associated with it.
            </p>
          </section>

          <section className="detail-section">
            <h2>3. Listings and review</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              Every listing is reviewed by our team before it goes live. We may approve, reject, or send
              a listing back with comments for changes. We may remove any listing that is inaccurate,
              misleading, fraudulent, or otherwise violates these terms, at our discretion and without
              notice.
            </p>
          </section>

          <section className="detail-section">
            <h2>4. Enquiries, messaging and documents</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              The platform lets you express interest in, ask questions about, or request documents for a
              listing, and to message the other party directly. Confidential documents are only released
              after the listing owner approves a request, and every download is logged. We are not
              responsible for the content of messages or documents exchanged between users, and we do
              not vet the outcome of any deal discussed on the platform.
            </p>
          </section>

          <section className="detail-section">
            <h2>5. No financial advice, no brokerage</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              EIP Africa does not provide investment, legal or financial advice, and does not act as a
              broker, agent or party to any transaction. Users are solely responsible for conducting
              their own due diligence before entering into any agreement with another user.
            </p>
          </section>

          <section className="detail-section">
            <h2>6. Fees</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              The platform is currently free to use. We may introduce paid plans, featured placement or
              other fees in the future; if we do, we will give notice before any existing feature you
              rely on becomes paid.
            </p>
          </section>

          <section className="detail-section">
            <h2>7. Acceptable use</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              You agree not to post false or misleading listings, impersonate another person or
              organization, scrape or harvest data from the platform, or use the platform for any
              unlawful purpose.
            </p>
          </section>

          <section className="detail-section">
            <h2>8. Changes to these terms</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              We may update these terms from time to time. Continued use of the platform after a change
              takes effect means you accept the updated terms.
            </p>
          </section>

          <section className="detail-section">
            <h2>9. Contact</h2>
            <p style={{ marginTop: 12, color: "var(--on-bone-muted)", lineHeight: 1.7 }}>
              Questions about these terms can be sent through the contact details on our homepage.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
